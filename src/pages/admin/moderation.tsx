import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';

interface ContentReport {
  id: string;
  reporterId: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUsername: string;
  contentType: string;
  contentId: string;
  contentPreview: string;
  reason: string;
  description: string | null;
  status: string;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  actionTaken: string | null;
  adminNotes: string | null;
  createdAt: string;
}

interface OffMarkUser {
  id: string;
  username: string;
  email: string;
  offMarkStatus: string;
  offMarkUntil: string | null;
  offMarkReason: string | null;
  offMarkCount: number;
  canComment: boolean;
  canPost: boolean;
  canChat: boolean;
  totalReportsAgainst: number;
}

// Mock data for reports
const mockReports: ContentReport[] = [
  {
    id: '1',
    reporterId: 'user-1',
    reporterUsername: 'AussiePunter',
    reportedUserId: 'user-2',
    reportedUsername: 'ToxicTroll123',
    contentType: 'community_post',
    contentId: 'post-1',
    contentPreview: 'This is absolute garbage. Anyone who bets on Labor is a complete moron...',
    reason: 'harassment',
    description: 'User is being aggressive and insulting to other members',
    status: 'pending',
    reviewedByAdminId: null,
    reviewedAt: null,
    actionTaken: null,
    adminNotes: null,
    createdAt: '2026-02-23T10:30:00Z',
  },
  {
    id: '2',
    reporterId: 'user-3',
    reporterUsername: 'MarketMaster',
    reportedUserId: 'user-4',
    reportedUsername: 'SpamBot99',
    contentType: 'market_comment',
    contentId: 'comment-1',
    contentPreview: 'Check out my crypto gains at scam-link.com! FREE MONEY!!!',
    reason: 'spam',
    description: null,
    status: 'pending',
    reviewedByAdminId: null,
    reviewedAt: null,
    actionTaken: null,
    adminNotes: null,
    createdAt: '2026-02-23T09:15:00Z',
  },
  {
    id: '3',
    reporterId: 'user-5',
    reporterUsername: 'PredictorPro',
    reportedUserId: 'user-6',
    reportedUsername: 'AngryUser',
    contentType: 'chat_message',
    contentId: 'msg-1',
    contentPreview: 'I hope you lose all your money, you deserve it for being so stupid',
    reason: 'inappropriate',
    description: 'Wishing harm on other users',
    status: 'reviewed',
    reviewedByAdminId: 'admin-1',
    reviewedAt: '2026-02-22T16:00:00Z',
    actionTaken: 'warning',
    adminNotes: 'First offense, issued warning',
    createdAt: '2026-02-22T14:30:00Z',
  },
];

// Mock Off-Mark users
const mockOffMarkUsers: OffMarkUser[] = [
  {
    id: 'user-2',
    username: 'ToxicTroll123',
    email: 'troll@example.com',
    offMarkStatus: 'restricted',
    offMarkUntil: '2026-03-01T00:00:00Z',
    offMarkReason: 'Multiple harassment reports',
    offMarkCount: 2,
    canComment: false,
    canPost: false,
    canChat: true,
    totalReportsAgainst: 5,
  },
  {
    id: 'user-7',
    username: 'BannedUser',
    email: 'banned@example.com',
    offMarkStatus: 'banned',
    offMarkUntil: null,
    offMarkReason: 'Repeated hate speech violations',
    offMarkCount: 4,
    canComment: false,
    canPost: false,
    canChat: false,
    totalReportsAgainst: 12,
  },
];

const reasonLabels: Record<string, string> = {
  harassment: 'Harassment',
  hate_speech: 'Hate Speech',
  spam: 'Spam',
  inappropriate: 'Inappropriate Content',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  actioned: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-700',
};

const offMarkStatusColors: Record<string, string> = {
  good_standing: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  restricted: 'bg-orange-100 text-orange-700',
  banned: 'bg-red-100 text-red-700',
};

const contentTypeIcons: Record<string, string> = {
  community_post: '📝',
  market_comment: '💬',
  chat_message: '💭',
};

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'offmark' | 'history'>('queue');
  const [reports, setReports] = useState<ContentReport[]>(mockReports);
  const [offMarkUsers, setOffMarkUsers] = useState<OffMarkUser[]>(mockOffMarkUsers);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    action: 'warning',
    notes: '',
    restrictDuration: '7',
  });

  const pendingReports = reports.filter(r => r.status === 'pending');
  const reviewedReports = reports.filter(r => r.status !== 'pending');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAction = () => {
    if (!selectedReport) return;

    // In real app, this would call API
    setReports(prev =>
      prev.map(r =>
        r.id === selectedReport.id
          ? {
              ...r,
              status: actionForm.action === 'dismiss' ? 'dismissed' : 'actioned',
              actionTaken: actionForm.action,
              adminNotes: actionForm.notes,
              reviewedAt: new Date().toISOString(),
            }
          : r
      )
    );

    setShowActionModal(false);
    setSelectedReport(null);
    setActionForm({ action: 'warning', notes: '', restrictDuration: '7' });
  };

  return (
    <>
      <Head>
        <title>Moderation | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Moderation">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Pending Reports</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingReports.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Reports Today</p>
            <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Off-Mark Users</p>
            <p className="text-2xl font-bold text-orange-600">{offMarkUsers.filter(u => u.offMarkStatus !== 'good_standing').length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Banned Users</p>
            <p className="text-2xl font-bold text-red-600">{offMarkUsers.filter(u => u.offMarkStatus === 'banned').length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'queue', label: 'Report Queue', count: pendingReports.length },
                { id: 'offmark', label: 'Off-Mark Users', count: offMarkUsers.filter(u => u.offMarkStatus !== 'good_standing').length },
                { id: 'history', label: 'Review History' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-foremark-green text-foremark-green'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-foremark-green/10 text-foremark-green' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Report Queue Tab */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                {pendingReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <span className="text-4xl block mb-3">✨</span>
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">No pending reports to review</p>
                  </div>
                ) : (
                  pendingReports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{contentTypeIcons[report.contentType]}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                              {reasonLabels[report.reason] || report.reason}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(report.createdAt)}</span>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-800 italic">&quot;{report.contentPreview}&quot;</p>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">
                              Reported by: <Link href={`/admin/traders/${report.reporterId}`} className="text-foremark-green hover:underline">{report.reporterUsername}</Link>
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-500">
                              Against: <Link href={`/admin/traders/${report.reportedUserId}`} className="text-foremark-green hover:underline font-medium">{report.reportedUsername}</Link>
                            </span>
                          </div>

                          {report.description && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Details:</span> {report.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowActionModal(true);
                            }}
                            className="px-4 py-2 bg-foremark-green text-white text-sm font-medium rounded-lg hover:bg-foremark-green-light"
                          >
                            Take Action
                          </button>
                          <button
                            onClick={() => {
                              setReports(prev =>
                                prev.map(r => r.id === report.id ? { ...r, status: 'dismissed' } : r)
                              );
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Off-Mark Users Tab */}
            {activeTab === 'offmark' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Restrictions</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reports</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {offMarkUsers.filter(u => u.offMarkStatus !== 'good_standing').map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <Link href={`/admin/traders/${user.id}`} className="hover:underline">
                            <p className="font-medium text-gray-900">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${offMarkStatusColors[user.offMarkStatus]}`}>
                            {user.offMarkStatus === 'banned' ? '🚫 Banned' : '⚠️ Off-Mark'}
                          </span>
                          <span className="text-xs text-gray-400 block mt-1">Count: {user.offMarkCount}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {user.offMarkReason || '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${user.canComment ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`} title="Comments">
                              💬
                            </span>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${user.canPost ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`} title="Posts">
                              📝
                            </span>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${user.canChat ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`} title="Chats">
                              💭
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-medium text-gray-900">{user.totalReportsAgainst}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {user.offMarkUntil ? formatDate(user.offMarkUntil) : 'Permanent'}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button className="text-foremark-green hover:underline text-sm">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Review History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {reviewedReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No reviewed reports yet</p>
                  </div>
                ) : (
                  reviewedReports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{contentTypeIcons[report.contentType]}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(report.createdAt)}</span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">{report.reportedUsername}</span> reported for {reasonLabels[report.reason] || report.reason}
                          </p>

                          {report.actionTaken && (
                            <div className="bg-gray-50 rounded p-2 text-sm">
                              <span className="font-medium">Action:</span> {report.actionTaken}
                              {report.adminNotes && <span className="text-gray-500"> - {report.adminNotes}</span>}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          Reviewed {report.reviewedAt ? formatDate(report.reviewedAt) : '-'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Modal */}
        {showActionModal && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowActionModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Take Action</h3>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Reported User: <strong>{selectedReport.reportedUsername}</strong></p>
                <p className="text-sm text-gray-500 italic">&quot;{selectedReport.contentPreview.slice(0, 100)}...&quot;</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <select
                    value={actionForm.action}
                    onChange={(e) => setActionForm({ ...actionForm, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                  >
                    <option value="warning">Issue Warning</option>
                    <option value="content_hidden">Hide Content Only</option>
                    <option value="off_mark_temp">Off-Mark (Temporary)</option>
                    <option value="off_mark_perm">Off-Mark (Permanent Ban)</option>
                    <option value="dismiss">Dismiss Report</option>
                  </select>
                </div>

                {actionForm.action === 'off_mark_temp' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Restriction Duration</label>
                    <select
                      value={actionForm.restrictDuration}
                      onChange={(e) => setActionForm({ ...actionForm, restrictDuration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="1">1 Day</option>
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                  <textarea
                    value={actionForm.notes}
                    onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                    placeholder="Add notes about this action..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  className="px-4 py-2 bg-foremark-green text-white rounded-lg hover:bg-foremark-green-light"
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
