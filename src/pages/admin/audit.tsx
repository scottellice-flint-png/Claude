import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import type { AuditLog, EntityType, AuditAction } from '@/types/admin';

interface AuditLogResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const entityTypes: EntityType[] = [
  'market',
  'category',
  'subcategory',
  'tag',
  'collection',
  'admin_user',
  'constraint_template',
];

const actionTypes: AuditAction[] = [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'resolve',
  'settle',
  'rollback',
  'login',
  'logout',
];

const actionIcons: Record<AuditAction, string> = {
  create: '✨',
  update: '📝',
  delete: '🗑️',
  approve: '✅',
  reject: '❌',
  resolve: '🎯',
  settle: '💰',
  rollback: '⏪',
  login: '🔑',
  logout: '🚪',
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState<EntityType | ''>('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (router.isReady) {
      fetchLogs();
    }
  }, [router.isReady, pagination.page, entityType, action, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());

      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data: AuditLogResponse = await res.json();
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Head>
        <title>Audit Logs | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Audit Logs">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as EntityType | '')}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Types</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as AuditAction | '')}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Actions</option>
                {actionTypes.map((act) => (
                  <option key={act} value={act}>
                    {actionIcons[act]} {act}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <button
              onClick={() => {
                setEntityType('');
                setAction('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green mx-auto"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No audit logs found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{actionIcons[log.action as AuditAction] || '📌'}</span>
                      <div>
                        <p className="font-medium text-gray-900">
                          <span className="capitalize">{log.action}</span>{' '}
                          <span className="text-gray-500">{log.entityType.replace('_', ' ')}</span>
                          {log.entityId && (
                            <span className="text-gray-400 ml-2 text-sm">#{log.entityId.slice(0, 8)}</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.userEmail || 'System'} • {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedLog === log.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {expandedLog === log.id && (
                    <div className="mt-4 pl-12 space-y-3">
                      {log.ipAddress && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">IP:</span> {log.ipAddress}
                        </p>
                      )}

                      {log.previousData && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Previous Data:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.previousData, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.newData && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">New Data:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.newData, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.metadata && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Metadata:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} logs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
