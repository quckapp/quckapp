import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  MessageSquare,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  Users,
  User,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge, Button, Modal } from '../components/UI';
import { addToast } from '../store/slices/toastSlice';
import adminApi from '../services/adminApi';
import type { AppDispatch } from '../store';

interface ContentItem {
  _id: string;
  type: 'message' | 'conversation' | 'user';
  content?: string;
  author: {
    _id: string;
    displayName: string;
    username: string;
  };
  reportCount: number;
  reasons: string[];
  flaggedAt?: string;
  createdAt: string;
  targetMessageId?: string;
  targetConversationId?: string;
  targetUserId?: string;
}

export default function Moderation() {
  const dispatch = useDispatch<AppDispatch>();

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadContent(1);
  }, [typeFilter]);

  const loadContent = async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await adminApi.getFlaggedContent({
        type: typeFilter || undefined,
        search: search || undefined,
        page: pageNum,
        limit: 20,
      });
      setContent(response.items || []);
      setTotal(response.total || 0);
      setPages(response.pages || 1);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load content:', error);
      dispatch(
        addToast({
          type: 'error',
          title: 'Failed to load flagged content',
          message: error.response?.data?.message || 'Please try again later',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadContent(1);
  };

  const handleDelete = async () => {
    if (!selectedItem || !deleteReason.trim()) return;

    setDeleting(true);
    try {
      if (selectedItem.targetMessageId) {
        await adminApi.deleteMessage(selectedItem.targetMessageId, deleteReason);
        dispatch(
          addToast({
            type: 'success',
            title: 'Content deleted',
            message: 'The message has been successfully deleted',
          })
        );
      } else if (selectedItem.targetConversationId) {
        await adminApi.deleteConversation(selectedItem.targetConversationId, deleteReason);
        dispatch(
          addToast({
            type: 'success',
            title: 'Conversation deleted',
            message: 'The conversation has been successfully deleted',
          })
        );
      } else if (selectedItem.targetUserId) {
        await adminApi.banUser(selectedItem.targetUserId, deleteReason);
        dispatch(
          addToast({
            type: 'success',
            title: 'User banned',
            message: 'The user has been successfully banned',
          })
        );
      }

      setShowDeleteModal(false);
      setSelectedItem(null);
      setDeleteReason('');
      loadContent(page);
    } catch (error: any) {
      console.error('Failed to delete content:', error);
      dispatch(
        addToast({
          type: 'error',
          title: 'Failed to delete content',
          message: error.response?.data?.message || 'Please try again later',
        })
      );
    } finally {
      setDeleting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return MessageSquare;
      case 'conversation':
        return Users;
      case 'user':
        return User;
      default:
        return MessageSquare;
    }
  };

  const getTypeColor = (type: string): 'info' | 'success' | 'warning' => {
    switch (type) {
      case 'message':
        return 'info';
      case 'conversation':
        return 'success';
      case 'user':
        return 'warning';
      default:
        return 'info';
    }
  };

  const messageCount = content.filter((c) => c.type === 'message').length;
  const conversationCount = content.filter((c) => c.type === 'conversation').length;
  const userCount = content.filter((c) => c.type === 'user').length;

  return (
    <div>
      <Header title="Content Moderation" onRefresh={() => loadContent(page)} loading={loading} />

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="message">Messages</option>
              <option value="conversation">Conversations</option>
              <option value="user">Users</option>
            </select>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">Flagged Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{messageCount}</p>
                <p className="text-sm text-gray-500">Messages</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{conversationCount}</p>
                <p className="text-sm text-gray-500">Conversations</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{userCount}</p>
                <p className="text-sm text-gray-500">Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Content</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Author</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Reports</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Reasons</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {content.map((item) => {
                const TypeIcon = getTypeIcon(item.type);

                return (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-gray-500" />
                        <Badge variant={getTypeColor(item.type)}>{item.type.toUpperCase()}</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 truncate max-w-[200px]">
                        {item.content || 'No preview available'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{item.author?.displayName || 'Unknown'}</p>
                        <p className="text-gray-500">@{item.author?.username || 'unknown'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={item.reportCount > 5 ? 'danger' : 'warning'}>
                        {item.reportCount} reports
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.reasons?.slice(0, 2).map((reason, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                          >
                            {reason}
                          </span>
                        ))}
                        {item.reasons?.length > 2 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            +{item.reasons.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowPreviewModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {content.length === 0 && !loading && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No flagged content found</p>
              <p className="text-sm text-gray-400 mt-1">Content with multiple reports will appear here</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading...</p>
            </div>
          )}

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
                  onClick={() => loadContent(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadContent(page + 1)}
                  disabled={page === pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Content Preview"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={getTypeColor(selectedItem.type)}>
                {selectedItem.type.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">
                {selectedItem.createdAt && new Date(selectedItem.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-900">{selectedItem.content || 'No content available'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Author:</span>
              <span className="font-medium">{selectedItem.author?.displayName || 'Unknown'}</span>
              <span className="text-gray-500">(@{selectedItem.author?.username || 'unknown'})</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Report Reasons:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedItem.reasons?.map((reason, idx) => (
                  <span
                    key={idx}
                    className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded-full"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">
                Reported {selectedItem.reportCount} times
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={
          selectedItem?.type === 'user'
            ? 'Ban User'
            : selectedItem?.type === 'conversation'
            ? 'Delete Conversation'
            : 'Delete Content'
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {selectedItem?.type === 'user'
              ? 'Are you sure you want to ban this user? They will not be able to access the platform.'
              : selectedItem?.type === 'conversation'
              ? 'Are you sure you want to delete this conversation? All messages will be removed.'
              : 'Are you sure you want to delete this content? This action cannot be undone.'}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for {selectedItem?.type === 'user' ? 'Ban' : 'Deletion'}
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder={`Provide a reason for ${
                selectedItem?.type === 'user' ? 'banning this user' : 'deleting this content'
              }...`}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={!deleteReason.trim() || deleting}
            >
              {deleting
                ? 'Processing...'
                : selectedItem?.type === 'user'
                ? 'Ban User'
                : 'Delete Content'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
