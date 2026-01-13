import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Flag,
  BarChart3,
  FileText,
  Server,
  LogOut,
  Shield,
  MessageSquare,
  MessageCircle,
  Megaphone,
  Settings,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import type { RootState, AppDispatch } from '../../store';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/conversations', icon: MessageCircle, label: 'Conversations' },
  { path: '/reports', icon: Flag, label: 'Reports' },
  { path: '/moderation', icon: MessageSquare, label: 'Moderation' },
  { path: '/broadcasts', icon: Megaphone, label: 'Broadcasts' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/audit-logs', icon: FileText, label: 'Audit Logs' },
  { path: '/system', icon: Server, label: 'System' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">QuckChat</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.displayName?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName || 'Admin'}</p>
            <p className="text-xs text-gray-400 truncate">
              {user?.role?.replace('_', ' ').toUpperCase()}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
