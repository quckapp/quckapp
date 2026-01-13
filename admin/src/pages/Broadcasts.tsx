import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Megaphone,
  Plus,
  Send,
  Clock,
  CheckCircle,
  Users,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge, Button, Modal } from '../components/UI';
import { fetchBroadcasts, createBroadcast, sendBroadcast, deleteBroadcast } from '../store/slices/broadcastSlice';
import { addToast } from '../store/slices/toastSlice';
import type { RootState, AppDispatch } from '../store';

interface Broadcast {
  _id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'active' | 'new' | 'custom';
  targetCount?: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  createdBy: {
    _id: string;
    displayName: string;
  };
  stats?: {
    delivered: number;
    read: number;
    failed: number;
  };
  createdAt: string;
}

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
  draft: 'default',
  scheduled: 'warning',
  sent: 'success',
  failed: 'danger',
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users', description: 'Send to all registered users' },
  { value: 'active', label: 'Active Users', description: 'Users active in the last 7 days' },
  { value: 'new', label: 'New Users', description: 'Users registered in the last 30 days' },
  { value: 'custom', label: 'Custom Segment', description: 'Select specific user groups' },
];

export default function Broadcasts() {
  const dispatch = useDispatch<AppDispatch>();
  const { broadcasts, total, page, pages, loading } = useSelector((state: RootState) => state.broadcast);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'all' as 'all' | 'active' | 'new' | 'custom',
    scheduledAt: '',
  });

  useEffect(() => {
    loadBroadcasts(1);
  }, [statusFilter]);

  const loadBroadcasts = (pageNum: number) => {
    dispatch(fetchBroadcasts({
      status: statusFilter || undefined,
      search: search || undefined,
      page: pageNum,
      limit: 10,
    }));
  };

  const handleSearch = () => {
    loadBroadcasts(1);
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) return;

    try {
      await dispatch(createBroadcast({
        title: formData.title,
        message: formData.message,
        targetAudience: formData.targetAudience,
        scheduledAt: formData.scheduledAt || undefined,
      })).unwrap();

      dispatch(addToast({
        type: 'success',
        title: 'Broadcast created',
        message: 'Your broadcast has been created successfully',
      }));

      setShowCreateModal(false);
      resetForm();
      loadBroadcasts(1);
    } catch (error: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Failed to create broadcast',
        message: error.message || 'Please try again later',
      }));
    }
  };

  const handleSend = async (broadcast: Broadcast) => {
    if (confirm(`Are you sure you want to send "${broadcast.title}" to ${broadcast.targetCount?.toLocaleString() || 'all'} users?`)) {
      try {
        await dispatch(sendBroadcast(broadcast._id)).unwrap();
        dispatch(addToast({
          type: 'success',
          title: 'Broadcast sent',
          message: `Your broadcast has been sent to ${broadcast.targetCount?.toLocaleString() || 'all'} users`,
        }));
        loadBroadcasts(page);
      } catch (error: any) {
        dispatch(addToast({
          type: 'error',
          title: 'Failed to send broadcast',
          message: error.message || 'Please try again later',
        }));
      }
    }
  };

  const handleDelete = async (broadcast: Broadcast) => {
    if (confirm(`Are you sure you want to delete "${broadcast.title}"?`)) {
      try {
        await dispatch(deleteBroadcast(broadcast._id)).unwrap();
        dispatch(addToast({
          type: 'success',
          title: 'Broadcast deleted',
          message: 'The broadcast has been deleted successfully',
        }));
        loadBroadcasts(page);
      } catch (error: any) {
        dispatch(addToast({
          type: 'error',
          title: 'Failed to delete broadcast',
          message: error.message || 'Please try again later',
        }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      targetAudience: 'all',
      scheduledAt: '',
    });
  };

  const draftCount = broadcasts.filter((b) => b.status === 'draft').length;
  const sentCount = broadcasts.filter((b) => b.status === 'sent').length;

  return (
    <div>
      <Header
        title="Broadcasts"
        onRefresh={() => loadBroadcasts(page)}
        loading={loading}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Broadcast
          </Button>
        }
      />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Megaphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">Total Broadcasts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{draftCount}</p>
                <p className="text-sm text-gray-500">Drafts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sentCount}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {broadcasts.reduce((acc, b) => acc + (b.stats?.delivered || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Total Delivered</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search broadcasts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <Button onClick={handleSearch} variant="secondary">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Broadcasts List */}
        <div className="space-y-4">
          {broadcasts.map((broadcast) => (
            <div
              key={broadcast._id}
              className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{broadcast.title}</h3>
                    <Badge variant={STATUS_COLORS[broadcast.status]}>
                      {broadcast.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3 line-clamp-2">{broadcast.message}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {broadcast.targetAudience === 'all' ? 'All Users' :
                       broadcast.targetAudience === 'active' ? 'Active Users' :
                       broadcast.targetAudience === 'new' ? 'New Users' : 'Custom'}
                      {broadcast.targetCount && ` (${broadcast.targetCount.toLocaleString()})`}
                    </span>
                    <span>
                      Created by: <strong>{broadcast.createdBy?.displayName || 'Admin'}</strong>
                    </span>
                    <span>{new Date(broadcast.createdAt).toLocaleDateString()}</span>
                  </div>

                  {broadcast.status === 'sent' && broadcast.stats && (
                    <div className="mt-3 flex items-center gap-4">
                      <span className="text-sm">
                        <span className="text-green-600 font-medium">{broadcast.stats.delivered.toLocaleString()}</span> delivered
                      </span>
                      <span className="text-sm">
                        <span className="text-blue-600 font-medium">{broadcast.stats.read.toLocaleString()}</span> read
                      </span>
                      {broadcast.stats.failed > 0 && (
                        <span className="text-sm">
                          <span className="text-red-600 font-medium">{broadcast.stats.failed.toLocaleString()}</span> failed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {broadcast.status === 'draft' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSend(broadcast)}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </Button>
                      <button
                        onClick={() => {
                          setSelectedBroadcast(broadcast);
                          setShowPreviewModal(true);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Preview"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(broadcast)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {broadcast.status === 'sent' && (
                    <button
                      onClick={() => {
                        setSelectedBroadcast(broadcast);
                        setShowPreviewModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {broadcasts.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No broadcasts found</p>
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Broadcast
              </Button>
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
                onClick={() => loadBroadcasts(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadBroadcasts(page + 1)}
                disabled={page === pages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Broadcast Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Broadcast"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Broadcast title..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Write your message..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.message.length}/500 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <div className="grid grid-cols-2 gap-3">
              {AUDIENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, targetAudience: option.value as typeof formData.targetAudience })}
                  className={`p-3 text-left rounded-lg border ${
                    formData.targetAudience === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft</p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.title.trim() || !formData.message.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Broadcast
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedBroadcast(null);
        }}
        title="Broadcast Details"
      >
        {selectedBroadcast && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
              <p className="text-gray-900 font-medium">{selectedBroadcast.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Message</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{selectedBroadcast.message}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <Badge variant={STATUS_COLORS[selectedBroadcast.status]}>
                  {selectedBroadcast.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Target</label>
                <p className="text-gray-900">{selectedBroadcast.targetAudience}</p>
              </div>
            </div>
            {selectedBroadcast.stats && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Delivery Stats</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedBroadcast.stats.delivered.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-700">Delivered</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedBroadcast.stats.read.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-700">Read</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {selectedBroadcast.stats.failed.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-700">Failed</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
