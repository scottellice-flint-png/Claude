import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { MarketStatus } from '@/types/admin';

interface DashboardProps {
  stats: {
    totalMarkets: number;
    draftMarkets: number;
    reviewMarkets: number;
    publishedMarkets: number;
    resolvedMarkets: number;
    totalCategories: number;
    totalTags: number;
    totalCollections: number;
    recentActivity: Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string | null;
      userEmail: string | null;
      createdAt: string;
    }>;
  };
}

export default function AdminDashboard({ stats }: DashboardProps) {
  const statusCards = [
    { label: 'Total Markets', value: stats.totalMarkets, color: 'bg-blue-500', href: '/admin/markets' },
    { label: 'Draft', value: stats.draftMarkets, color: 'bg-gray-500', href: '/admin/markets?status=draft' },
    { label: 'Under Review', value: stats.reviewMarkets, color: 'bg-yellow-500', href: '/admin/markets?status=review' },
    { label: 'Published', value: stats.publishedMarkets, color: 'bg-green-500', href: '/admin/markets?status=published' },
    { label: 'Resolved', value: stats.resolvedMarkets, color: 'bg-purple-500', href: '/admin/markets?status=resolved' },
  ];

  const entityCards = [
    { label: 'Categories', value: stats.totalCategories, icon: '📁', href: '/admin/categories' },
    { label: 'Tags', value: stats.totalTags, icon: '🏷️', href: '/admin/tags' },
    { label: 'Collections', value: stats.totalCollections, icon: '📚', href: '/admin/collections' },
  ];

  return (
    <>
      <Head>
        <title>Dashboard | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Dashboard">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {statusCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`w-3 h-12 ${card.color} rounded-full`} />
              </div>
            </Link>
          ))}
        </div>

        {/* Entity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {entityCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{card.icon}</span>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/admin/markets/new"
                className="flex items-center gap-3 p-3 bg-foremark-green/10 hover:bg-foremark-green/20 rounded-lg transition-colors"
              >
                <span className="text-2xl">➕</span>
                <div>
                  <p className="font-medium text-foremark-green">Create New Market</p>
                  <p className="text-sm text-gray-500">Draft a new prediction market</p>
                </div>
              </Link>
              <Link
                href="/admin/markets?status=review"
                className="flex items-center gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
              >
                <span className="text-2xl">👀</span>
                <div>
                  <p className="font-medium text-yellow-700">Review Pending Markets</p>
                  <p className="text-sm text-gray-500">{stats.reviewMarkets} markets awaiting review</p>
                </div>
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span className="text-2xl">📁</span>
                <div>
                  <p className="font-medium text-blue-700">Manage Categories</p>
                  <p className="text-sm text-gray-500">Organize market categories</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Link href="/admin/audit" className="text-sm text-foremark-green hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg">
                      {activity.action === 'create' && '✨'}
                      {activity.action === 'update' && '📝'}
                      {activity.action === 'delete' && '🗑️'}
                      {activity.action === 'approve' && '✅'}
                      {activity.action === 'resolve' && '🎯'}
                      {!['create', 'update', 'delete', 'approve', 'resolve'].includes(activity.action) && '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        <span className="capitalize">{activity.action}</span>{' '}
                        <span className="text-gray-500">{activity.entityType}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.userEmail} • {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Market Lifecycle Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Market Lifecycle</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {['Draft', 'Review', 'Approved', 'Published', 'Trading Halted', 'Resolved', 'Settled', 'Archived'].map(
              (status, index, arr) => (
                <div key={status} className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                      status === 'Review' ? 'bg-yellow-100 text-yellow-700' :
                      status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                      status === 'Published' ? 'bg-green-100 text-green-700' :
                      status === 'Trading Halted' ? 'bg-orange-100 text-orange-700' :
                      status === 'Resolved' ? 'bg-purple-100 text-purple-700' :
                      status === 'Settled' ? 'bg-teal-100 text-teal-700' :
                      'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {status}
                  </span>
                  {index < arr.length - 1 && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  try {
    // Get market counts by status
    const marketCounts = await prisma.market.groupBy({
      by: ['status'],
      _count: true,
    });

    const countByStatus = (status: MarketStatus) =>
      marketCounts.find((c: { status: string; _count: number }) => c.status === status)?._count || 0;

    // Get entity counts
    const [totalCategories, totalTags, totalCollections, recentActivity] = await Promise.all([
      prisma.category.count(),
      prisma.tag.count(),
      prisma.marketCollection.count(),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          userEmail: true,
          createdAt: true,
        },
      }),
    ]);

    const stats = {
      totalMarkets: marketCounts.reduce((sum: number, c: { _count: number }) => sum + c._count, 0),
      draftMarkets: countByStatus('draft'),
      reviewMarkets: countByStatus('review'),
      publishedMarkets: countByStatus('published'),
      resolvedMarkets: countByStatus('resolved') + countByStatus('settled'),
      totalCategories,
      totalTags,
      totalCollections,
      recentActivity: recentActivity.map((a: { createdAt: Date; [key: string]: unknown }) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    };

    return {
      props: { stats },
    };
  } catch (error) {
    // Database might not be initialized yet
    return {
      props: {
        stats: {
          totalMarkets: 0,
          draftMarkets: 0,
          reviewMarkets: 0,
          publishedMarkets: 0,
          resolvedMarkets: 0,
          totalCategories: 0,
          totalTags: 0,
          totalCollections: 0,
          recentActivity: [],
        },
      },
    };
  }
};
