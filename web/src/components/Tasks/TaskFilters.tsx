import type { TaskFilter, TaskSort } from '../../types';
import { Filter, ArrowUpDown, Tag } from 'lucide-react';

interface TaskFiltersProps {
  filter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
  sortBy: TaskSort;
  setSortBy: (sort: TaskSort) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  categories: string[];
  taskCounts: {
    all: number;
    active: number;
    completed: number;
  };
}

export default function TaskFilters({
  filter,
  setFilter,
  sortBy,
  setSortBy,
  categoryFilter,
  setCategoryFilter,
  categories,
  taskCounts,
}: TaskFiltersProps) {
  const filterOptions: { value: TaskFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: taskCounts.all },
    { value: 'active', label: 'Active', count: taskCounts.active },
    { value: 'completed', label: 'Completed', count: taskCounts.completed },
  ];

  const sortOptions: { value: TaskSort; label: string }[] = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'title', label: 'Title' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex bg-gray-100 rounded-lg p-1">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === option.value
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {option.label}
                <span className="ml-1.5 text-xs opacity-60">({option.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TaskSort)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
