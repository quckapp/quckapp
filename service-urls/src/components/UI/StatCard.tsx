import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  onClick?: () => void;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
};

export default function StatCard({ title, value, subtitle, icon: Icon, color, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
