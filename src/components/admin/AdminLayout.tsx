import { ReactNode, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import type { AdminRole } from '@/types/admin';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Markets', href: '/admin/markets', icon: '📈' },
  { label: 'Categories', href: '/admin/categories', icon: '📁' },
  { label: 'Tags', href: '/admin/tags', icon: '🏷️' },
  { label: 'Collections', href: '/admin/collections', icon: '📚' },
  { label: 'Constraints', href: '/admin/constraints', icon: '⚙️' },
  { label: 'Users', href: '/admin/traders', icon: '👤' },
  { label: 'Admin Users', href: '/admin/users', icon: '👥', permission: 'admin' },
  { label: 'Audit Logs', href: '/admin/audit', icon: '📋' },
];

const roleLabels: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
};

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foremark-green"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/admin/login');
    return null;
  }

  const user = session?.user;
  const userRole = user?.role as AdminRole;

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (item.permission === 'admin') {
      return ['super_admin', 'admin'].includes(userRole);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navbar */}
      <nav className="bg-foremark-green shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-foremark-green-dark p-2 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-foremark-lime font-bold text-xl">MarketOps</span>
              <span className="text-white/60 text-sm">Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="text-white/80 hover:text-white text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Site
            </Link>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-white text-sm font-medium">{user?.name}</div>
                <div className="text-white/60 text-xs">{roleLabels[userRole]}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-white shadow-lg fixed left-0 top-16 bottom-0 transition-all duration-300 z-40`}
        >
          <nav className="p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = router.pathname === item.href ||
                (item.href !== '/admin' && router.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-foremark-green text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
          <div className="p-6">
            {title && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
