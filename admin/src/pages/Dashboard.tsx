import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  MessageCircle,
  Flag,
  UserCheck,
  UserX,
  Activity,
  Clock,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { StatCard } from '../components/UI';
import { fetchDashboardStats, fetchRealTimeStats } from '../store/slices/dashboardSlice';
import type { RootState, AppDispatch } from '../store';

export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { stats, realTimeStats, loading } = useSelector((state: RootState) => state.dashboard);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchRealTimeStats());

    const interval = setInterval(() => {
      dispatch(fetchRealTimeStats());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchDashboardStats());
    dispatch(fetchRealTimeStats());
  };

  return (
    <div>
      <Header title="Dashboard" onRefresh={handleRefresh} loading={loading} />

      <div className="p-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 mb-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user?.displayName || 'Admin'}!
          </h2>
          <p className="text-primary-100">
            Here's what's happening with your chat application today.
          </p>
        </div>

        {/* Live Stats */}
        {realTimeStats && (
          <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-900">Live Activity</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{realTimeStats.onlineUsers}</p>
                <p className="text-sm text-gray-500">Online Users</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{realTimeStats.messagesPerMinute}</p>
                <p className="text-sm text-gray-500">Messages/min</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {realTimeStats.activeConversationsLastHour}
                </p>
                <p className="text-sm text-gray-500">Active Chats</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {realTimeStats.messagesLastHour}
                </p>
                <p className="text-sm text-gray-500">Msgs Last Hour</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Users"
            value={stats?.users.total || 0}
            subtitle={`${stats?.users.newToday || 0} new today`}
            icon={Users}
            color="blue"
            trend={stats?.users.growthRate}
            onClick={() => navigate('/users')}
          />
          <StatCard
            title="Active Users"
            value={stats?.users.active || 0}
            subtitle={`${stats?.users.online || 0} online now`}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            title="Messages Today"
            value={stats?.messages.today || 0}
            subtitle={`${stats?.messages.total?.toLocaleString() || 0} total`}
            icon={MessageSquare}
            color="purple"
            trend={stats?.messages.growthRate}
          />
          <StatCard
            title="Conversations"
            value={stats?.conversations.total || 0}
            subtitle={`${stats?.conversations.active || 0} active`}
            icon={MessageCircle}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Pending Reports"
            value={stats?.reports.pending || 0}
            subtitle={`${stats?.reports.resolvedToday || 0} resolved today`}
            icon={Flag}
            color="red"
            onClick={() => navigate('/reports')}
          />
          <StatCard
            title="Banned Users"
            value={stats?.users.banned || 0}
            icon={UserX}
            color="gray"
          />
          <StatCard
            title="New This Week"
            value={stats?.users.newThisWeek || 0}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="New This Month"
            value={stats?.users.newThisMonth || 0}
            icon={Clock}
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Manage Users', path: '/users', icon: Users, color: 'bg-blue-500' },
              { label: 'View Reports', path: '/reports', icon: Flag, color: 'bg-red-500' },
              { label: 'Analytics', path: '/analytics', icon: Activity, color: 'bg-purple-500' },
              { label: 'Audit Logs', path: '/audit-logs', icon: Clock, color: 'bg-gray-500' },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`p-2 ${action.color} rounded-lg`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
