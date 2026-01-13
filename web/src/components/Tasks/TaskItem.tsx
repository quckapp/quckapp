import { useState } from 'react';
import type { Task } from '../../types';
import TaskForm from './TaskForm';
import {
  Check,
  Circle,
  Trash2,
  Edit3,
  Calendar,
  Flag,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const priorityColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };

  const priorityBorders = {
    low: 'border-l-green-400',
    medium: 'border-l-yellow-400',
    high: 'border-l-red-400',
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  if (isEditing) {
    return (
      <TaskForm
        initialData={task}
        isEditing
        onSubmit={(updates) => {
          onUpdate(task.id, updates);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md ${
        priorityBorders[task.priority]
      } border-l-4 ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggle(task.id, task.completed)}
            className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              task.completed
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
          >
            {task.completed ? (
              <Check className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4 text-transparent" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h3
              className={`font-medium text-gray-900 ${
                task.completed ? 'line-through text-gray-500' : ''
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  priorityColors[task.priority]
                }`}
              >
                <Flag className="w-3 h-3" />
                {task.priority}
              </span>

              {task.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isOverdue
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}

              {task.category && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  <Tag className="w-3 h-3" />
                  {task.category}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
