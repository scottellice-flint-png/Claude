import { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import type { AuditEventOutput, MarketStateSnapshot } from '@/types/auditEvents';

interface ExportResponse {
  data?: AuditEventOutput[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ReconstructResponse {
  success: boolean;
  reconstructedAt: string;
  requestedTimestamp: string;
  snapshot: MarketStateSnapshot;
}

interface VerifyResponse {
  success: boolean;
  verifiedAt: string;
  range: {
    startSeq: string;
    endSeq: string;
  };
  result: {
    valid: boolean;
    totalVerified: number;
    brokenAt: string | null;
    message: string;
  };
}

export default function AuditToolsPage() {
  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMarketId, setExportMarketId] = useState('');
  const [exportBetId, setExportBetId] = useState('');
  const [exportStartTime, setExportStartTime] = useState('');
  const [exportEndTime, setExportEndTime] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportError, setExportError] = useState('');

  // Reconstruct state
  const [reconstructLoading, setReconstructLoading] = useState(false);
  const [reconstructMarketId, setReconstructMarketId] = useState('');
  const [reconstructTimestamp, setReconstructTimestamp] = useState('');
  const [reconstructResult, setReconstructResult] = useState<MarketStateSnapshot | null>(null);
  const [reconstructError, setReconstructError] = useState('');

  // Verify state
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse['result'] | null>(null);
  const [verifyError, setVerifyError] = useState('');

  // Event browser state
  const [events, setEvents] = useState<AuditEventOutput[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsPagination, setEventsPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [filterMarketId, setFilterMarketId] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Export handlers
  const handleExport = async (type: 'events' | 'market' | 'bet') => {
    setExportLoading(true);
    setExportError('');

    try {
      const params = new URLSearchParams();
      params.set('type', type);
      params.set('format', exportFormat);

      if (type === 'market' && exportMarketId) {
        params.set('marketId', exportMarketId);
      } else if (type === 'bet' && exportBetId) {
        params.set('betId', exportBetId);
      } else {
        if (exportMarketId) params.set('marketId', exportMarketId);
        if (exportStartTime) params.set('startTime', new Date(exportStartTime).toISOString());
        if (exportEndTime) params.set('endTime', new Date(exportEndTime).toISOString());
      }

      const res = await fetch(`/api/admin/audit/export?${params}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        `audit-export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  // Reconstruct handler
  const handleReconstruct = async () => {
    if (!reconstructMarketId || !reconstructTimestamp) {
      setReconstructError('Market ID and timestamp are required');
      return;
    }

    setReconstructLoading(true);
    setReconstructError('');
    setReconstructResult(null);

    try {
      const params = new URLSearchParams({
        marketId: reconstructMarketId,
        timestamp: new Date(reconstructTimestamp).toISOString(),
      });

      const res = await fetch(`/api/admin/audit/reconstruct?${params}`);
      const data: ReconstructResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as unknown as { error: string }).error || 'Reconstruction failed');
      }

      setReconstructResult(data.snapshot);
    } catch (err) {
      setReconstructError(err instanceof Error ? err.message : 'Reconstruction failed');
    } finally {
      setReconstructLoading(false);
    }
  };

  // Verify handler
  const handleVerify = async () => {
    setVerifyLoading(true);
    setVerifyError('');
    setVerifyResult(null);

    try {
      const res = await fetch('/api/admin/audit/verify');
      const data: VerifyResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as unknown as { error: string }).error || 'Verification failed');
      }

      setVerifyResult(data.result);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Fetch events
  const fetchEvents = async (page: number = 1) => {
    setEventsLoading(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
      });

      if (filterMarketId) params.set('marketId', filterMarketId);
      if (filterEventType) params.set('eventTypes', filterEventType);

      const res = await fetch(`/api/admin/audit/events?${params}`);
      const data: ExportResponse = await res.json();

      if (res.ok && data.data && data.pagination) {
        setEvents(data.data);
        setEventsPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Head>
        <title>Audit Tools | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Audit & Compliance Tools">
        <div className="space-y-6">
          {/* Export Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Audit Events</h2>
            <p className="text-sm text-gray-500 mb-4">
              Export audit events for regulatory review. Rate limited to 10 exports per minute.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market ID</label>
                <input
                  type="text"
                  value={exportMarketId}
                  onChange={(e) => setExportMarketId(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bet/Order ID</label>
                <input
                  type="text"
                  value={exportBetId}
                  onChange={(e) => setExportBetId(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={exportStartTime}
                  onChange={(e) => setExportStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={exportEndTime}
                  onChange={(e) => setExportEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Format:</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <button
                onClick={() => handleExport('events')}
                disabled={exportLoading}
                className="px-4 py-2 bg-foremark-green text-white rounded-lg hover:bg-foremark-green/90 disabled:opacity-50"
              >
                {exportLoading ? 'Exporting...' : 'Export Events'}
              </button>

              {exportMarketId && (
                <button
                  onClick={() => handleExport('market')}
                  disabled={exportLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Export Market Lifecycle
                </button>
              )}

              {exportBetId && (
                <button
                  onClick={() => handleExport('bet')}
                  disabled={exportLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Export Bet Lifecycle
                </button>
              )}
            </div>

            {exportError && (
              <p className="mt-2 text-sm text-red-600">{exportError}</p>
            )}
          </div>

          {/* Reconstruct Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reconstruct Market State</h2>
            <p className="text-sm text-gray-500 mb-4">
              Reconstruct the state of any market at any point in time using event replay.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market ID *</label>
                <input
                  type="text"
                  value={reconstructMarketId}
                  onChange={(e) => setReconstructMarketId(e.target.value)}
                  placeholder="Enter market ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Timestamp *</label>
                <input
                  type="datetime-local"
                  value={reconstructTimestamp}
                  onChange={(e) => setReconstructTimestamp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleReconstruct}
                  disabled={reconstructLoading || !reconstructMarketId || !reconstructTimestamp}
                  className="px-4 py-2 bg-foremark-green text-white rounded-lg hover:bg-foremark-green/90 disabled:opacity-50"
                >
                  {reconstructLoading ? 'Reconstructing...' : 'Reconstruct State'}
                </button>
              </div>
            </div>

            {reconstructError && (
              <p className="mt-2 text-sm text-red-600">{reconstructError}</p>
            )}

            {reconstructResult && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Reconstructed State</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium">{reconstructResult.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Yes Price</p>
                    <p className="font-medium">{reconstructResult.currentYesPrice}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Volume</p>
                    <p className="font-medium">${reconstructResult.volume.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Trade Count</p>
                    <p className="font-medium">{reconstructResult.tradeCount}</p>
                  </div>
                </div>

                {reconstructResult.outcomes && reconstructResult.outcomes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Outcomes</p>
                    <div className="space-y-2">
                      {reconstructResult.outcomes.map((outcome) => (
                        <div
                          key={outcome.id}
                          className="flex items-center justify-between bg-white p-2 rounded"
                        >
                          <span className="font-medium">{outcome.label}</span>
                          <div className="flex items-center gap-4">
                            <span>{outcome.currentPrice}%</span>
                            {outcome.isResolved && (
                              <span className={outcome.isWinner ? 'text-green-600' : 'text-red-600'}>
                                {outcome.isWinner ? 'Winner' : 'Loser'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <pre className="mt-4 text-xs bg-white p-2 rounded overflow-x-auto">
                  {JSON.stringify(reconstructResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Verify Hash Chain Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Verify Hash Chain Integrity</h2>
            <p className="text-sm text-gray-500 mb-4">
              Verify that the audit log has not been tampered with by checking the hash chain.
              This operation is rate-limited to 5 verifications per 5 minutes.
            </p>

            <button
              onClick={handleVerify}
              disabled={verifyLoading}
              className="px-4 py-2 bg-foremark-green text-white rounded-lg hover:bg-foremark-green/90 disabled:opacity-50"
            >
              {verifyLoading ? 'Verifying...' : 'Verify Hash Chain'}
            </button>

            {verifyError && (
              <p className="mt-2 text-sm text-red-600">{verifyError}</p>
            )}

            {verifyResult && (
              <div className={`mt-4 p-4 rounded-lg ${verifyResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-2xl ${verifyResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {verifyResult.valid ? '✓' : '✗'}
                  </span>
                  <span className={`font-medium ${verifyResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                    {verifyResult.message}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Events verified: {verifyResult.totalVerified.toLocaleString()}
                </p>
                {verifyResult.brokenAt && (
                  <p className="text-sm text-red-600 mt-1">
                    Chain broken at event: {verifyResult.brokenAt}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Event Browser Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Audit Events</h2>

            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market ID</label>
                <input
                  type="text"
                  value={filterMarketId}
                  onChange={(e) => setFilterMarketId(e.target.value)}
                  placeholder="Filter by market"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Types</option>
                  <option value="MARKET_CREATED">Market Created</option>
                  <option value="MARKET_UPDATED">Market Updated</option>
                  <option value="MARKET_RESOLVED">Market Resolved</option>
                  <option value="MARKET_SETTLED">Market Settled</option>
                  <option value="USER_LOGIN_SUCCESS">User Login</option>
                  <option value="ADMIN_LOGIN_SUCCESS">Admin Login</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => fetchEvents(1)}
                  disabled={eventsLoading}
                  className="px-4 py-2 bg-foremark-green text-white rounded-lg hover:bg-foremark-green/90 disabled:opacity-50"
                >
                  {eventsLoading ? 'Loading...' : 'Search Events'}
                </button>
              </div>
            </div>

            {events.length > 0 && (
              <>
                <div className="divide-y divide-gray-200 border rounded-lg overflow-hidden">
                  {events.map((event) => (
                    <div key={event.id} className="p-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            event.actorType === 'admin' ? 'bg-purple-100 text-purple-800' :
                            event.actorType === 'user' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.actorType}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{event.eventType}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(event.occurredAt)} • Seq: {event.seq}
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedEvent === event.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {expandedEvent === event.id && (
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {event.marketId && (
                              <div>
                                <p className="text-gray-500">Market ID</p>
                                <p className="font-mono text-xs">{event.marketId}</p>
                              </div>
                            )}
                            {event.actorId && (
                              <div>
                                <p className="text-gray-500">Actor ID</p>
                                <p className="font-mono text-xs">{event.actorId}</p>
                              </div>
                            )}
                            {event.ipAddress && (
                              <div>
                                <p className="text-gray-500">IP Address</p>
                                <p className="font-mono text-xs">{event.ipAddress}</p>
                              </div>
                            )}
                            {event.reasonCode && (
                              <div>
                                <p className="text-gray-500">Reason Code</p>
                                <p className="font-mono text-xs">{event.reasonCode}</p>
                              </div>
                            )}
                          </div>

                          {event.beforeState && (
                            <div>
                              <p className="text-gray-500 mb-1">Before State:</p>
                              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(event.beforeState, null, 2)}
                              </pre>
                            </div>
                          )}

                          {event.afterState && (
                            <div>
                              <p className="text-gray-500 mb-1">After State:</p>
                              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(event.afterState, null, 2)}
                              </pre>
                            </div>
                          )}

                          {event.integrityHash && (
                            <div>
                              <p className="text-gray-500">Integrity Hash</p>
                              <p className="font-mono text-xs break-all">{event.integrityHash}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {eventsPagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Showing page {eventsPagination.page} of {eventsPagination.totalPages}
                      ({eventsPagination.total} total events)
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchEvents(eventsPagination.page - 1)}
                        disabled={eventsPagination.page === 1 || eventsLoading}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchEvents(eventsPagination.page + 1)}
                        disabled={eventsPagination.page === eventsPagination.totalPages || eventsLoading}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {events.length === 0 && !eventsLoading && (
              <p className="text-gray-500 text-center py-8">
                No events found. Click "Search Events" to load audit events.
              </p>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
