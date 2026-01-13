import { Bell, Search, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
}

export default function Header({ title, onRefresh, loading, actions }: HeaderProps) {
  const { realTimeStats } = useSelector((state: RootState) => state.dashboard);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
        {actions && <div className="ml-4">{actions}</div>}
      </div>

      <div className="flex items-center gap-4">
        {realTimeStats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-gray-600">{realTimeStats.onlineUsers} online</span>
            </div>
            <div className="text-gray-400">|</div>
            <span className="text-gray-600">{realTimeStats.messagesPerMinute} msg/min</span>
          </div>
        )}

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
          />
        </div>

        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
