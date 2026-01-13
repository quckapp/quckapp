import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Flag,
  User,
  MessageSquare,
  Users,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge, Button, Modal } from '../components/UI';
import { fetchReports, updateReport } from '../store/slices/reportsSlice';
import type { RootState, AppDispatch } from '../store';
import type { Report } from '../types';

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  pending: 'warning',
  reviewing: 'info',
  resolved: 'success',
  dismissed: 'default',
};

const TYPE_ICONS = {
  user: User,
  message: MessageSquare,
  conversation: Users,
  community: Globe,
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate_speech: 'Hate Speech',
  inappropriate_content: 'Inappropriate Content',
  violence: 'Violence',
  fake_account: 'Fake Account',
  impersonation: 'Impersonation',
  scam: 'Scam',
  other: 'Other',
};

export default function Reports() {
  const dispatch = useDispatch<AppDispatch>();
  const { reports, total, page, pages, loading } = useSelector((state: RootState) => state.reports);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  useEffect(() => {
    loadReports(1);
  }, [statusFilter, typeFilter]);

  const loadReports = (pageNum: number) => {
    dispatch(
      fetchReports({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page: pageNum,
        limit: 20,
      })
    );
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    await dispatch(
      updateReport({
        reportId: selectedReport._id,
        data: { status: 'resolved', resolution, actionTaken },
      })
    );
    setShowResolveModal(false);
    setSelectedReport(null);
    setResolution('');
    setActionTaken('');
  };

  const handleDismiss = async (report: Report) => {
    if (confirm('Are you sure you want to dismiss this report?')) {
      await dispatch(updateReport({ reportId: report._id, data: { status: 'dismissed' } }));
    }
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <Header title="Reports" onRefresh={() => loadReports(page)} loading={loading} />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Flag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">Total Reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            <option value="user">User</option>
            <option value="message">Message</option>
            <option value="conversation">Conversation</option>
            <option value="community">Community</option>
          </select>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {reports.map((report) => {
            const TypeIcon = TYPE_ICONS[report.type] || Flag;

            return (
              <div
                key={report._id}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <TypeIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="info">{report.type.toUpperCase()}</Badge>
                        <Badge variant={STATUS_COLORS[report.status]}>
                          {report.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {REASON_LABELS[report.reason] || report.reason}
                      </h3>
                      {report.description && (
                        <p className="text-gray-600 text-sm mb-2">{report.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          Reported by: <strong>{report.reportedBy?.displayName || 'Unknown'}</strong>
                        </span>
                        {report.targetUserId && (
                          <span>
                            Against: <strong>{report.targetUserId?.displayName || 'Unknown'}</strong>
                          </span>
                        )}
                        <span>{new Date(report.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowResolveModal(true);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDismiss(report)}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {reports.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Flag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reports found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-gray-500">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadReports(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadReports(page + 1)}
                disabled={page === pages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      <Modal isOpen={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Report">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe the resolution..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
            <textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="What action was taken?"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowResolveModal(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleResolve}>
              Resolve Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
