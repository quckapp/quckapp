import { useState } from 'react';
import { Plus, X, Calendar, Flag, Tag } from 'lucide-react';
import type { Task } from '../../types';

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  onCancel?: () => void;
  initialData?: Partial<Task>;
  isEditing?: boolean;
}

export default function TaskForm({ onSubmit, onCancel, initialData, isEditing }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initialData?.priority || 'medium');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [isExpanded, setIsExpanded] = useState(isEditing || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      category: category.trim(),
      completed: initialData?.completed || false,
    });

    if (!isEditing) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setCategory('');
      setIsExpanded(false);
    }
  };

  if (!isExpanded && !isEditing) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Add new task</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full text-lg font-medium border-0 border-b-2 border-gray-100 focus:border-indigo-500 focus:ring-0 pb-2 transition-colors"
          autoFocus
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description (optional)"
          rows={2}
          className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-600"
        />

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-gray-400" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-32"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            if (isEditing && onCancel) {
              onCancel();
            } else {
              setIsExpanded(false);
              setTitle('');
              setDescription('');
            }
          }}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {isEditing ? 'Save Changes' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}
