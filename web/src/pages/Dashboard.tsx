import Header from '../components/Layout/Header';
import TaskForm from '../components/Tasks/TaskForm';
import TaskList from '../components/Tasks/TaskList';
import TaskFilters from '../components/Tasks/TaskFilters';
import { useTasks } from '../hooks/useTasks';
import { CheckCircle, Clock, ListTodo, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const {
    tasks,
    allTasks,
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
  } = useTasks();

  const taskCounts = {
    all: allTasks.length,
    active: allTasks.filter((t) => !t.completed).length,
    completed: allTasks.filter((t) => t.completed).length,
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Database Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Please check your Firestore database setup and security rules.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{taskCounts.all}</p>
                <p className="text-xs text-gray-500">Total Tasks</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{taskCounts.active}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{taskCounts.completed}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Task Form */}
        <div className="mb-6">
          <TaskForm onSubmit={addTask} />
        </div>

        {/* Filters */}
        <TaskFilters
          filter={filter}
          setFilter={setFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
          taskCounts={taskCounts}
        />

        {/* Task List */}
        <TaskList
          tasks={tasks}
          loading={loading}
          onToggle={toggleComplete}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      </main>
    </div>
  );
}
