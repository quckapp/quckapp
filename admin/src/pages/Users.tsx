import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Search,
  Filter,
  MoreVertical,
  Ban,
  CheckCircle,
  Shield,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge, Button, Modal } from '../components/UI';
import { fetchUsers, banUser, unbanUser, verifyUser, updateUserRole } from '../store/slices/usersSlice';
import { addToast } from '../store/slices/toastSlice';
import type { RootState, AppDispatch } from '../store';
import type { User } from '../types';

const ROLES = ['user', 'moderator', 'admin', 'super_admin'];
const ROLE_COLORS: Record<string, 'default' | 'warning' | 'info' | 'purple'> = {
  user: 'default',
  moderator: 'warning',
  admin: 'info',
  super_admin: 'purple',
};

export default function Users() {
  const dispatch = useDispatch<AppDispatch>();
  const { users, total, page, pages, loading } = useSelector((state: RootState) => state.users);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [bannedFilter, setBannedFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [actionUser, setActionUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers(1);
  }, [roleFilter, bannedFilter]);

  const loadUsers = (pageNum: number) => {
    dispatch(
      fetchUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        isBanned: bannedFilter === 'true' ? true : bannedFilter === 'false' ? false : undefined,
        page: pageNum,
        limit: 20,
      })
    );
  };

  const handleSearch = () => {
    loadUsers(1);
  };

  const handleBan = async () => {
    if (!actionUser || !banReason.trim()) return;
    try {
      await dispatch(banUser({ userId: actionUser._id, reason: banReason })).unwrap();
      dispatch(addToast({
        type: 'success',
        title: 'User banned',
        message: `${actionUser.displayName} has been banned successfully`,
      }));
      setShowBanModal(false);
      setBanReason('');
      setActionUser(null);
    } catch (error: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Failed to ban user',
        message: error.message || 'Please try again later',
      }));
    }
  };

  const handleUnban = async (user: User) => {
    if (confirm(`Are you sure you want to unban ${user.displayName}?`)) {
      try {
        await dispatch(unbanUser(user._id)).unwrap();
        dispatch(addToast({
          type: 'success',
          title: 'User unbanned',
          message: `${user.displayName} has been unbanned successfully`,
        }));
      } catch (error: any) {
        dispatch(addToast({
          type: 'error',
          title: 'Failed to unban user',
          message: error.message || 'Please try again later',
        }));
      }
    }
  };

  const handleVerify = async (user: User) => {
    if (confirm(`Are you sure you want to verify ${user.displayName}?`)) {
      try {
        await dispatch(verifyUser(user._id)).unwrap();
        dispatch(addToast({
          type: 'success',
          title: 'User verified',
          message: `${user.displayName} has been verified successfully`,
        }));
      } catch (error: any) {
        dispatch(addToast({
          type: 'error',
          title: 'Failed to verify user',
          message: error.message || 'Please try again later',
        }));
      }
    }
  };

  const handleRoleChange = async (role: string) => {
    if (!actionUser) return;
    try {
      await dispatch(updateUserRole({ userId: actionUser._id, role })).unwrap();
      dispatch(addToast({
        type: 'success',
        title: 'Role updated',
        message: `${actionUser.displayName}'s role has been updated to ${role}`,
      }));
      setShowRoleModal(false);
      setActionUser(null);
    } catch (error: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Failed to update role',
        message: error.message || 'Please try again later',
      }));
    }
  };

  return (
    <div>
      <Header title="User Management" onRefresh={() => loadUsers(page)} loading={loading} />

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
            <select
              value={bannedFilter}
              onChange={(e) => setBannedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="false">Active</option>
              <option value="true">Banned</option>
            </select>
            <Button onClick={handleSearch}>
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {users.length} of {total} users
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">User</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Joined</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{user.displayName}</span>
                          {user.isVerified && (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500">@{user.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={ROLE_COLORS[user.role || 'user'] || 'default'}>
                      {(user.role || 'user').replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBanned ? (
                      <Badge variant="danger">BANNED</Badge>
                    ) : user.status === 'online' ? (
                      <Badge variant="success">Online</Badge>
                    ) : (
                      <Badge variant="default">Offline</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {!user.isVerified && (
                        <button
                          onClick={() => handleVerify(user)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Verify User"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      {user.isBanned ? (
                        <button
                          onClick={() => handleUnban(user)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Unban User"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActionUser(user);
                            setShowBanModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Ban User"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {currentUser?.role === 'super_admin' && (
                        <button
                          onClick={() => {
                            setActionUser(user);
                            setShowRoleModal(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Change Role"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
                  onClick={() => loadUsers(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadUsers(page + 1)}
                  disabled={page === pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ban Modal */}
      <Modal isOpen={showBanModal} onClose={() => setShowBanModal(false)} title="Ban User">
        <div className="space-y-4">
          <p className="text-gray-600">
            You are about to ban <strong>{actionUser?.displayName}</strong>. Please provide a reason.
          </p>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Reason for ban..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowBanModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBan} disabled={!banReason.trim()}>
              Ban User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title="Change User Role">
        <div className="space-y-4">
          <p className="text-gray-600">
            Select a new role for <strong>{actionUser?.displayName}</strong>
          </p>
          <div className="space-y-2">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border ${
                  actionUser?.role === role
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <span className="font-medium">{role.replace('_', ' ').toUpperCase()}</span>
                {actionUser?.role === role && (
                  <CheckCircle className="w-5 h-5 text-primary-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
