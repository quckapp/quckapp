import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Link2,
  Monitor,
  Code2,
  Cpu,
  Server,
  Boxes,
  Database,
  Flame,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import type { RootState, AppDispatch } from '../../store';
import { ENVIRONMENTS, ENVIRONMENT_LABELS, type Environment } from '../../types';

const envIcons: Record<string, React.ElementType> = {
  local: Monitor,
  development: Code2,
  qa: Cpu,
  uat1: Server,
  uat2: Server,
  uat3: Server,
  staging: Boxes,
  production: Flame,
};

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
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">QuckApp</h1>
            <p className="text-xs text-gray-400">Service URLs</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-1 px-3">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </NavLink>
          </li>

          <li className="pt-4 pb-2">
            <span className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Environments
            </span>
          </li>

          {ENVIRONMENTS.map((env: Environment) => {
            const Icon = envIcons[env] || Database;
            return (
              <li key={env}>
                <NavLink
                  to={`/env/${env}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{ENVIRONMENT_LABELS[env]}</span>
                </NavLink>
              </li>
            );
          })}
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
