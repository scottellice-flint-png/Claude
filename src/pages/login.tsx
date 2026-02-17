import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import Head from 'next/head';

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2;

interface FormData {
  // Step 1 - Personal Details
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirthDay: string;
  dateOfBirthMonth: string;
  dateOfBirthYear: string;
  gender: string;
  phoneNumber: string;
  email: string;
  address: string;
  // Step 2 - Account Details
  username: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  marketingConsent: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualAddress, setShowManualAddress] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirthDay: '',
    dateOfBirthMonth: '',
    dateOfBirthYear: '',
    gender: '',
    phoneNumber: '',
    email: '',
    address: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    marketingConsent: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.userType === 'user') {
      router.push('/');
    }
  }, [status, session, router]);

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!formData.dateOfBirthDay || !formData.dateOfBirthMonth || !formData.dateOfBirthYear) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const year = parseInt(formData.dateOfBirthYear);
      const currentYear = new Date().getFullYear();
      if (currentYear - year < 18) {
        errors.dateOfBirth = 'You must be 18 or older to register';
      }
    }
    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('user-credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Redirect to home or previous page
        const callbackUrl = router.query.callbackUrl as string || '/';
        router.push(callbackUrl);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupStep1 = () => {
    if (validateStep1()) {
      setSignupStep(2);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Auto-login after registration
      const loginResult = await signIn('user-credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (loginResult?.error) {
        // Registration succeeded but login failed - redirect to login
        setMode('login');
        setError('Account created! Please log in.');
      } else {
        router.push('/');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{mode === 'login' ? 'Log In' : 'Sign Up'} | Foremark</title>
      </Head>

      <div className="min-h-screen bg-[#0F4C4C] flex flex-col">
        {/* Header with logo */}
        <div className="pt-8 pb-4 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-[#C8E64C] rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[#0F4C4C]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-white text-2xl font-bold">Foremark</span>
          </Link>
        </div>

        {/* Step indicator for signup */}
        {mode === 'signup' && (
          <div className="flex justify-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              signupStep >= 1 ? 'bg-[#C8E64C] text-[#0F4C4C]' : 'bg-white/20 text-white/60'
            }`}>
              1
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              signupStep >= 2 ? 'bg-[#C8E64C] text-[#0F4C4C]' : 'bg-white/20 text-white/60'
            }`}>
              2
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 bg-white rounded-t-3xl px-6 py-8 overflow-y-auto">
          {mode === 'login' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Welcome Back</h1>
              <p className="text-gray-600 text-center mb-8">Log in to your Foremark account</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#0F4C4C] focus:ring-[#0F4C4C]" />
                    <span className="text-sm text-gray-600">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-sm text-[#0F4C4C] font-medium hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0F4C4C] text-white py-4 rounded-lg font-semibold hover:bg-[#0a3a3a] transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Logging in...
                    </span>
                  ) : 'Log In'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(''); }}
                    className="text-[#0F4C4C] font-semibold hover:underline"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              {signupStep === 1 ? (
                <div className="max-w-md mx-auto">
                  <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Personal Details</h1>
                  <p className="text-gray-600 text-center mb-6 text-sm">
                    Your personal details must match your ID so you can be verified
                  </p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => updateFormData('firstName', e.target.value)}
                          placeholder="First Name"
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                            fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Must Match Your ID</p>
                      {fieldErrors.firstName && <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>}
                    </div>

                    {/* Middle Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Middle Name</label>
                      <input
                        type="text"
                        value={formData.middleName}
                        onChange={(e) => updateFormData('middleName', e.target.value)}
                        placeholder="Middle Name"
                        className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        placeholder="Last Name"
                        className={`w-full px-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                          fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Must Match Your ID</p>
                      {fieldErrors.lastName && <p className="text-xs text-red-500 mt-1">{fieldErrors.lastName}</p>}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of birth</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            value={formData.dateOfBirthDay}
                            onChange={(e) => updateFormData('dateOfBirthDay', e.target.value.replace(/\D/g, '').slice(0, 2))}
                            placeholder="DD"
                            maxLength={2}
                            className={`w-full pl-10 pr-2 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-center ${
                              fieldErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <input
                          type="text"
                          value={formData.dateOfBirthMonth}
                          onChange={(e) => updateFormData('dateOfBirthMonth', e.target.value.replace(/\D/g, '').slice(0, 2))}
                          placeholder="MM"
                          maxLength={2}
                          className={`w-full px-2 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-center ${
                            fieldErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <input
                          type="text"
                          value={formData.dateOfBirthYear}
                          onChange={(e) => updateFormData('dateOfBirthYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="YYYY"
                          maxLength={4}
                          className={`w-full px-2 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-center ${
                            fieldErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {fieldErrors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{fieldErrors.dateOfBirth}</p>}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </span>
                        <select
                          value={formData.gender}
                          onChange={(e) => updateFormData('gender', e.target.value)}
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent appearance-none bg-white ${
                            fieldErrors.gender ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-binary</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </div>
                      {fieldErrors.gender && <p className="text-xs text-red-500 mt-1">{fieldErrors.gender}</p>}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </span>
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                          placeholder="Phone Number"
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                            fieldErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {fieldErrors.phoneNumber && <p className="text-xs text-red-500 mt-1">{fieldErrors.phoneNumber}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          placeholder="Email Address"
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                            fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => updateFormData('address', e.target.value)}
                          placeholder="Begin typing your address"
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                            fieldErrors.address ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
                      <p className="text-center mt-2">
                        <span className="text-gray-500 text-sm">Can&apos;t find address? </span>
                        <button
                          type="button"
                          onClick={() => setShowManualAddress(!showManualAddress)}
                          className="text-[#0F4C4C] font-semibold text-sm hover:underline"
                        >
                          ENTER MANUALLY
                        </button>
                      </p>
                    </div>

                    <p className="text-xs text-gray-500 text-center pt-2">
                      See Foremark&apos;s{' '}
                      <Link href="/privacy" className="text-[#0F4C4C] underline">Privacy Policy</Link>
                      {' '}for information on how we collect, handle and store your personal information.
                      Foremark may contact you regarding your registration and/or verification.
                      Click &quot;Continue&quot; to proceed.
                    </p>

                    <button
                      type="button"
                      onClick={handleSignupStep1}
                      className="w-full bg-[#0F4C4C] text-white py-4 rounded-lg font-semibold hover:bg-[#0a3a3a] transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="flex items-center mb-6">
                    <button
                      onClick={() => setSignupStep(1)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 flex-1 text-center pr-6">Account Details</h1>
                  </div>
                  <p className="text-gray-600 text-center mb-6 text-sm">
                    Create your username and password
                  </p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => updateFormData('username', e.target.value.toLowerCase())}
                          placeholder="Choose a username"
                          className={`w-full pl-10 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                            fieldErrors.username ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">This will be visible to other users</p>
                      {fieldErrors.username && <p className="text-xs text-red-500 mt-1">{fieldErrors.username}</p>}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          placeholder="Create a password"
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                            fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                      {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                          placeholder="Confirm your password"
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent ${
                            fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
                    </div>

                    {/* Terms and Conditions */}
                    <div className="space-y-3 pt-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.agreeToTerms}
                          onChange={(e) => updateFormData('agreeToTerms', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-[#0F4C4C] focus:ring-[#0F4C4C] mt-0.5"
                        />
                        <span className="text-sm text-gray-600">
                          I agree to the{' '}
                          <Link href="/terms" className="text-[#0F4C4C] underline">Terms and Conditions</Link>
                          {' '}and{' '}
                          <Link href="/privacy" className="text-[#0F4C4C] underline">Privacy Policy</Link>
                        </span>
                      </label>
                      {fieldErrors.agreeToTerms && <p className="text-xs text-red-500">{fieldErrors.agreeToTerms}</p>}

                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.marketingConsent}
                          onChange={(e) => updateFormData('marketingConsent', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-[#0F4C4C] focus:ring-[#0F4C4C] mt-0.5"
                        />
                        <span className="text-sm text-gray-600">
                          I consent to receiving marketing communications from Foremark
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#0F4C4C] text-white py-4 rounded-lg font-semibold hover:bg-[#0a3a3a] transition-colors disabled:opacity-50 mt-6"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating Account...
                        </span>
                      ) : 'Create Account'}
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(''); setSignupStep(1); }}
                    className="text-[#0F4C4C] font-semibold hover:underline"
                  >
                    Log In
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Responsible Gambling Footer */}
        <div className="bg-white px-6 py-4 text-center text-xs text-gray-500 border-t">
          <p>Think. Is this a bet you really want to place?</p>
          <p className="mt-1">
            For free and confidential support call{' '}
            <span className="font-semibold">1800 858 858</span>
          </p>
        </div>
      </div>
    </>
  );
}
