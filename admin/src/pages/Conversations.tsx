import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MessageCircle,
  Users,
  User,
  Search,
  Filter,
  Eye,
  Trash2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge, Button, Modal } from '../components/UI';
import { fetchConversations, deleteConversation, lockConversation } from '../store/slices/conversationsSlice';
import type { RootState, AppDispatch } from '../store';

interface Participant {
  _id: string;
  displayName: string;
  username: string;
  avatar?: string;
  status?: 'online' | 'offline';
}

interface Conversation {
  _id: string;
  type: 'single' | 'group';
  name?: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    type: string;
    createdAt: string;
    sender: {
      displayName: string;
    };
  };
  messageCount: number;
  isLocked?: boolean;
  createdAt: string;
  lastMessageAt?: string;
}

export default function Conversations() {
  const dispatch = useDispatch<AppDispatch>();
  const { conversations, total, page, pages, loading } = useSelector(
    (state: RootState) => state.conversations
  );

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    loadConversations(1);
  }, [typeFilter]);

  const loadConversations = (pageNum: number) => {
    dispatch(
      fetchConversations({
        search: search || undefined,
        type: typeFilter || undefined,
        page: pageNum,
        limit: 20,
      })
    );
  };

  const handleSearch = () => {
    loadConversations(1);
  };

  const handleDelete = async () => {
    if (!selectedConversation || !deleteReason.trim()) return;

    await dispatch(
      deleteConversation({
        conversationId: selectedConversation._id,
        reason: deleteReason,
      })
    );

    setShowDeleteModal(false);
    setSelectedConversation(null);
    setDeleteReason('');
    loadConversations(page);
  };

  const handleToggleLock = async (conversation: Conversation) => {
    const action = conversation.isLocked ? 'unlock' : 'lock';
    if (
      confirm(
        `Are you sure you want to ${action} this conversation? ${
          action === 'lock' ? 'Users will not be able to send messages.' : ''
        }`
      )
    ) {
      await dispatch(
        lockConversation({
          conversationId: conversation._id,
          lock: !conversation.isLocked,
        })
      );
      loadConversations(page);
    }
  };

  const singleCount = conversations.filter((c) => c.type === 'single').length;
  const groupCount = conversations.filter((c) => c.type === 'group').length;

  return (
    <div>
      <Header title="Conversations" onRefresh={() => loadConversations(page)} loading={loading} />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">Total Conversations</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{singleCount}</p>
                <p className="text-sm text-gray-500">Direct Chats</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{groupCount}</p>
                <p className="text-sm text-gray-500">Group Chats</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {conversations.reduce((acc, c) => acc + c.messageCount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Total Messages</p>
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
                placeholder="Search by participant name..."
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
              <option value="single">Direct Chats</option>
              <option value="group">Group Chats</option>
            </select>
            <Button onClick={handleSearch} variant="secondary">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Conversations Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                  Participants
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                  Last Message
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Messages</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Created</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <tr key={conversation._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {conversation.type === 'single' ? (
                        <User className="w-4 h-4 text-green-600" />
                      ) : (
                        <Users className="w-4 h-4 text-purple-600" />
                      )}
                      <Badge variant={conversation.type === 'single' ? 'success' : 'info'}>
                        {conversation.type === 'single' ? 'Direct' : 'Group'}
                      </Badge>
                      {conversation.isLocked && <Lock className="w-4 h-4 text-red-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {conversation.type === 'group' && conversation.name ? (
                        <span className="font-medium text-gray-900">{conversation.name}</span>
                      ) : (
                        <div className="flex -space-x-2">
                          {conversation.participants.slice(0, 3).map((p, i) => (
                            <div
                              key={p._id}
                              className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center border-2 border-white"
                              title={p.displayName}
                            >
                              <span className="text-xs text-primary-600 font-medium">
                                {p.displayName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                          {conversation.participants.length > 3 && (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-xs text-gray-600 font-medium">
                                +{conversation.participants.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-sm text-gray-500">
                        ({conversation.participants.length} participants)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {conversation.lastMessage ? (
                      <div className="max-w-[200px]">
                        <p className="text-sm text-gray-900 truncate">
                          {conversation.lastMessage.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          by {conversation.lastMessage.sender?.displayName}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No messages yet</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">
                      {conversation.messageCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(conversation.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedConversation(conversation);
                          setShowDetailsModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleLock(conversation)}
                        className={`p-2 rounded-lg ${
                          conversation.isLocked
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-orange-600 hover:bg-orange-50'
                        }`}
                        title={conversation.isLocked ? 'Unlock' : 'Lock'}
                      >
                        {conversation.isLocked ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedConversation(conversation);
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
              ))}
            </tbody>
          </table>

          {conversations.length === 0 && !loading && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No conversations found</p>
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
                  onClick={() => loadConversations(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadConversations(page + 1)}
                  disabled={page === pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedConversation(null);
        }}
        title="Conversation Details"
        size="lg"
      >
        {selectedConversation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
                <Badge variant={selectedConversation.type === 'single' ? 'success' : 'info'}>
                  {selectedConversation.type === 'single' ? 'Direct Chat' : 'Group Chat'}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <Badge variant={selectedConversation.isLocked ? 'danger' : 'success'}>
                  {selectedConversation.isLocked ? 'Locked' : 'Active'}
                </Badge>
              </div>
            </div>

            {selectedConversation.name && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Group Name</label>
                <p className="text-gray-900 font-medium">{selectedConversation.name}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Participants ({selectedConversation.participants.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedConversation.participants.map((participant) => (
                  <div
                    key={participant._id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm text-primary-600 font-medium">
                        {participant.displayName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{participant.displayName}</p>
                      <p className="text-xs text-gray-500">@{participant.username}</p>
                    </div>
                    <span
                      className={`ml-auto w-2 h-2 rounded-full ${
                        participant.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    ></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Messages</p>
                <p className="text-xl font-bold text-gray-900">
                  {selectedConversation.messageCount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(selectedConversation.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedConversation.lastMessage && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Last Message</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedConversation.lastMessage.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    by {selectedConversation.lastMessage.sender?.displayName} •{' '}
                    {new Date(selectedConversation.lastMessage.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedConversation(null);
          setDeleteReason('');
        }}
        title="Delete Conversation"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this conversation? This will remove all messages and
            cannot be undone.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Deletion
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Provide a reason for deleting this conversation..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={!deleteReason.trim()}>
              Delete Conversation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
