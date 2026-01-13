import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Task, TaskFilter, TaskSort } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sortBy, setSortBy] = useState<TaskSort>('createdAt');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasksData: Task[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Task[];
        setTasks(tasksData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!currentUser) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        ...task,
        userId: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
      console.error('Add task error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const taskRef = doc(db, 'tasks', id);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  };

  const deleteTask = async (id: string) => {
    const taskRef = doc(db, 'tasks', id);
    await deleteDoc(taskRef);
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await updateTask(id, { completed: !completed });
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      if (filter === 'active') return !task.completed;
      if (filter === 'completed') return task.completed;
      return true;
    })
    .filter((task) => {
      if (categoryFilter === 'all') return true;
      return task.category === categoryFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

  const categories = [...new Set(tasks.map((t) => t.category).filter(Boolean))];

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    loading,
    error,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    categoryFilter,
    setCategoryFilter,
    categories,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
  };
}
