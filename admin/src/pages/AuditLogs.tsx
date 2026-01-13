import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  History,
  User,
  Settings,
  Shield,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge, Button } from '../components/UI';
import { fetchAuditLogs } from '../store/slices/auditLogsSlice';
import type { RootState, AppDispatch } from '../store';

const ACTION_ICONS: Record<string, typeof History> = {
  user_ban: AlertTriangle,
  user_unban: Shield,
  role_change: Settings,
  report_resolve: Shield,
  settings_update: Settings,
  default: History,
};

const ACTION_COLORS: Record<string, 'danger' | 'success' | 'warning' | 'info' | 'default'> = {
  user_ban: 'danger',
  user_unban: 'success',
  role_change: 'warning',
  report_resolve: 'success',
  report_dismiss: 'default',
  settings_update: 'info',
  user_verify: 'success',
  login: 'info',
  logout: 'default',
};

const ACTION_LABELS: Record<string, string> = {
  user_ban: 'Banned User',
  user_unban: 'Unbanned User',
  role_change: 'Changed Role',
  report_resolve: 'Resolved Report',
  report_dismiss: 'Dismissed Report',
  settings_update: 'Updated Settings',
  user_verify: 'Verified User',
  login: 'Logged In',
  logout: 'Logged Out',
  user_delete: 'Deleted User',
  message_delete: 'Deleted Message',
  conversation_delete: 'Deleted Conversation',
  community_action: 'Community Action',
};

export default function AuditLogs() {
  const dispatch = useDispatch<AppDispatch>();
  const { logs, total, page, pages, loading } = useSelector((state: RootState) => state.auditLogs);

  const [actionFilter, setActionFilter] = useState<string>('');
  const [adminFilter, setAdminFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadLogs(1);
  }, [actionFilter]);

  const loadLogs = (pageNum: number) => {
    dispatch(
      fetchAuditLogs({
        action: actionFilter || undefined,
        adminId: adminFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: pageNum,
        limit: 20,
      })
    );
  };

  const handleSearch = () => {
    loadLogs(1);
  };

  const formatDetails = (details: Record<string, unknown>): string => {
    if (!details) return '';
    const entries = Object.entries(details)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .slice(0, 3);
    return entries.join(' | ');
  };

  return (
    <div>
      <Header title="Audit Logs" onRefresh={() => loadLogs(page)} loading={loading} />

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-4">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Actions</option>
              {Object.keys(ACTION_LABELS).map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action]}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by admin ID..."
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {logs.length} of {total} audit log entries
        </div>

        {/* Logs Timeline */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const ActionIcon = ACTION_ICONS[log.action] || ACTION_ICONS.default;
              const actionColor = ACTION_COLORS[log.action] || 'default';

              return (
                <div key={log._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        actionColor === 'danger'
                          ? 'bg-red-100'
                          : actionColor === 'success'
                            ? 'bg-green-100'
                            : actionColor === 'warning'
                              ? 'bg-yellow-100'
                              : actionColor === 'info'
                                ? 'bg-blue-100'
                                : 'bg-gray-100'
                      }`}
                    >
                      <ActionIcon
                        className={`w-5 h-5 ${
                          actionColor === 'danger'
                            ? 'text-red-600'
                            : actionColor === 'success'
                              ? 'text-green-600'
                              : actionColor === 'warning'
                                ? 'text-yellow-600'
                                : actionColor === 'info'
                                  ? 'text-blue-600'
                                  : 'text-gray-600'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Badge variant={actionColor}>
                          {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>
                          <strong>{log.admin?.displayName || 'Unknown Admin'}</strong>
                          <span className="text-gray-400"> (@{log.admin?.username || 'unknown'})</span>
                        </span>
                      </div>

                      {log.targetUser && (
                        <div className="text-sm text-gray-600 mb-1">
                          Target:{' '}
                          <strong>
                            {log.targetUser.displayName} (@{log.targetUser.username})
                          </strong>
                        </div>
                      )}

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-sm text-gray-500 bg-gray-50 rounded px-2 py-1 mt-2 font-mono">
                          {formatDetails(log.details)}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>IP: {log.ipAddress || 'N/A'}</span>
                        {log.userAgent && (
                          <span className="truncate max-w-[300px]">
                            UA: {log.userAgent.slice(0, 50)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {logs.length === 0 && !loading && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No audit logs found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadLogs(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadLogs(page + 1)}
                  disabled={page === pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
