export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type TaskFilter = 'all' | 'active' | 'completed';
export type TaskSort = 'createdAt' | 'dueDate' | 'priority' | 'title';
