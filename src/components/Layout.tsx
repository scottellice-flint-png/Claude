import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useStore } from '@/store';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const user = useStore((state) => state.user);

  const navItems = [
    { href: '/', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/profile', label: 'Profile' },
  ];

  const formatBalance = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-foremark-green sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl text-white foremark-logo">FOREMARK</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    router.pathname === item.href
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Balance */}
            {user && (
              <div className="flex items-center space-x-2 bg-foremark-green-light/50 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-foremark-lime rounded-full"></div>
                <span className="text-white font-semibold">
                  {formatBalance(user.balance)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16 px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 mx-1 py-2 text-center rounded-full text-sm font-semibold transition-all ${
                router.pathname === item.href
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label.toUpperCase()}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-foremark-green foremark-logo">FOREMARK</span>
              <span className="text-gray-400 text-sm">| Prediction Markets</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-foremark-green text-sm">
                Terms
              </a>
              <a href="#" className="text-gray-500 hover:text-foremark-green text-sm">
                Privacy
              </a>
              <a href="#" className="text-gray-500 hover:text-foremark-green text-sm">
                About
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-20"></div>
    </div>
  );
}
