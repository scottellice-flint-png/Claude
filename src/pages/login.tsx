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

  // Check for mode query parameter to set initial mode
  useEffect(() => {
    if (router.query.mode === 'signup') {
      setMode('signup');
    }
  }, [router.query.mode]);

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

      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Branding (hidden on mobile, visible on lg+) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-[#0F4C4C] flex-col justify-between p-8 xl:p-12">
          <div className="space-y-6">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Australia&apos;s Premier<br />Prediction Market
            </h1>
            <p className="text-white/80 text-lg">
              Trade on the outcomes that matter. Politics, sport, economics, and more.
            </p>

            {/* Features */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C8E64C] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#0F4C4C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-white">Secure & transparent trading</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C8E64C] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#0F4C4C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-white">Real-time market prices</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C8E64C] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#0F4C4C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-white">Join a community of predictors</span>
              </div>
            </div>
          </div>

          <div className="text-white/60 text-sm">
            <p>Think. Is this a bet you really want to place?</p>
            <p className="mt-1">For support call 1800 858 858</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col bg-gray-50 lg:bg-white">
          {/* Mobile Header - Step indicator only (branding is in navbar) */}
          {mode === 'signup' && (
            <div className="lg:hidden bg-[#0F4C4C] pt-4 pb-12 px-4 sm:px-6">
              <div className="max-w-md mx-auto">
                <div className="flex justify-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    signupStep >= 1 ? 'bg-[#C8E64C] text-[#0F4C4C]' : 'bg-white/20 text-white/60'
                  }`}>
                    1
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    signupStep >= 2 ? 'bg-[#C8E64C] text-[#0F4C4C]' : 'bg-white/20 text-white/60'
                  }`}>
                    2
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Container */}
          <div className={`flex-1 lg:flex lg:items-center lg:justify-center ${mode === 'signup' ? '-mt-8' : 'mt-0'} lg:mt-0`}>
            <div className={`${mode === 'signup' ? 'bg-white rounded-t-3xl' : 'bg-white'} lg:rounded-none lg:bg-transparent px-4 sm:px-6 py-8 lg:py-12 w-full max-w-md lg:max-w-lg mx-auto lg:px-8`}>

              {/* Desktop Step Indicator */}
              {mode === 'signup' && (
                <div className="hidden lg:flex justify-center gap-3 mb-8">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    signupStep >= 1 ? 'bg-[#C8E64C] text-[#0F4C4C]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    signupStep >= 2 ? 'bg-[#C8E64C] text-[#0F4C4C]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                </div>
              )}

              {mode === 'login' ? (
                <>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-2">Welcome Back</h1>
                  <p className="text-gray-600 text-center mb-8">Log in to your Foremark account</p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
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
                          placeholder="Enter your email"
                          className="w-full pl-12 pr-4 py-3.5 lg:py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base"
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
                          placeholder="Enter your password"
                          className="w-full pl-12 pr-4 py-3.5 lg:py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
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
                      className="w-full bg-[#0F4C4C] text-white py-4 rounded-xl font-semibold hover:bg-[#0a3a3a] transition-colors disabled:opacity-50 text-base"
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
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-2">Personal Details</h1>
                      <p className="text-gray-600 text-center mb-6 text-sm lg:text-base">
                        Your personal details must match your ID so you can be verified
                      </p>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Name Row - Side by side on larger screens */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* First Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                            <input
                              type="text"
                              value={formData.firstName}
                              onChange={(e) => updateFormData('firstName', e.target.value)}
                              placeholder="First Name"
                              className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
                                fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {fieldErrors.firstName && <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>}
                          </div>

                          {/* Last Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                            <input
                              type="text"
                              value={formData.lastName}
                              onChange={(e) => updateFormData('lastName', e.target.value)}
                              placeholder="Last Name"
                              className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
                                fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {fieldErrors.lastName && <p className="text-xs text-red-500 mt-1">{fieldErrors.lastName}</p>}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 -mt-2">Names must match your ID</p>

                        {/* Date of Birth */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={formData.dateOfBirthDay}
                              onChange={(e) => updateFormData('dateOfBirthDay', e.target.value.replace(/\D/g, '').slice(0, 2))}
                              placeholder="DD"
                              maxLength={2}
                              className={`w-full px-3 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-center text-base ${
                                fieldErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            <input
                              type="text"
                              value={formData.dateOfBirthMonth}
                              onChange={(e) => updateFormData('dateOfBirthMonth', e.target.value.replace(/\D/g, '').slice(0, 2))}
                              placeholder="MM"
                              maxLength={2}
                              className={`w-full px-3 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-center text-base ${
                                fieldErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            <input
                              type="text"
                              value={formData.dateOfBirthYear}
                              onChange={(e) => updateFormData('dateOfBirthYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="YYYY"
                              maxLength={4}
                              className={`w-full px-3 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-center text-base ${
                                fieldErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                          </div>
                          {fieldErrors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{fieldErrors.dateOfBirth}</p>}
                        </div>

                        {/* Gender and Phone Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Gender */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                            <div className="relative">
                              <select
                                value={formData.gender}
                                onChange={(e) => updateFormData('gender', e.target.value)}
                                className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent appearance-none bg-white text-base ${
                                  fieldErrors.gender ? 'border-red-500' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select gender</option>
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
                            <input
                              type="tel"
                              value={formData.phoneNumber}
                              onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                              placeholder="04XX XXX XXX"
                              className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
                                fieldErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {fieldErrors.phoneNumber && <p className="text-xs text-red-500 mt-1">{fieldErrors.phoneNumber}</p>}
                          </div>
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            placeholder="you@example.com"
                            className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
                              fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                        </div>

                        {/* Address */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => updateFormData('address', e.target.value)}
                            placeholder="Start typing your address..."
                            className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
                              fieldErrors.address ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
                          <p className="text-center mt-2">
                            <button
                              type="button"
                              onClick={() => setShowManualAddress(!showManualAddress)}
                              className="text-[#0F4C4C] font-medium text-sm hover:underline"
                            >
                              Enter address manually
                            </button>
                          </p>
                        </div>

                        <p className="text-xs text-gray-500 text-center pt-2">
                          By continuing, you agree to Foremark&apos;s{' '}
                          <Link href="/privacy" className="text-[#0F4C4C] underline">Privacy Policy</Link>.
                        </p>

                        <button
                          type="button"
                          onClick={handleSignupStep1}
                          className="w-full bg-[#0F4C4C] text-white py-4 rounded-xl font-semibold hover:bg-[#0a3a3a] transition-colors text-base"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center mb-6">
                        <button
                          onClick={() => setSignupStep(1)}
                          className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex-1 text-center pr-8">Account Details</h1>
                      </div>
                      <p className="text-gray-600 text-center mb-6 text-sm lg:text-base">
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
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
                            <input
                              type="text"
                              value={formData.username}
                              onChange={(e) => updateFormData('username', e.target.value.toLowerCase())}
                              placeholder="Choose a username"
                              className={`w-full pl-10 pr-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
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
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => updateFormData('password', e.target.value)}
                            placeholder="Create a password"
                            className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
                              fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                          {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                          <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                            placeholder="Confirm your password"
                            className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent text-base ${
                              fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
                        </div>

                        {/* Terms and Conditions */}
                        <div className="space-y-3 pt-4">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.agreeToTerms}
                              onChange={(e) => updateFormData('agreeToTerms', e.target.checked)}
                              className="w-5 h-5 rounded border-gray-300 text-[#0F4C4C] focus:ring-[#0F4C4C] mt-0.5 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-600">
                              I agree to the{' '}
                              <Link href="/terms" className="text-[#0F4C4C] underline">Terms and Conditions</Link>
                              {' '}and{' '}
                              <Link href="/privacy" className="text-[#0F4C4C] underline">Privacy Policy</Link>
                            </span>
                          </label>
                          {fieldErrors.agreeToTerms && <p className="text-xs text-red-500">{fieldErrors.agreeToTerms}</p>}

                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.marketingConsent}
                              onChange={(e) => updateFormData('marketingConsent', e.target.checked)}
                              className="w-5 h-5 rounded border-gray-300 text-[#0F4C4C] focus:ring-[#0F4C4C] mt-0.5 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-600">
                              I consent to receiving marketing communications from Foremark
                            </span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-[#0F4C4C] text-white py-4 rounded-xl font-semibold hover:bg-[#0a3a3a] transition-colors disabled:opacity-50 mt-6 text-base"
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
          </div>

          {/* Responsible Gambling Footer - Mobile only */}
          <div className="lg:hidden bg-white px-4 py-4 text-center text-xs text-gray-500 border-t mt-auto">
            <p>Think. Is this a bet you really want to place?</p>
            <p className="mt-1">
              For free and confidential support call{' '}
              <span className="font-semibold">1800 858 858</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
