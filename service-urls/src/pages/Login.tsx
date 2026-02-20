import { useState, FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login, clearError } from '../store/slices/authSlice';
import type { RootState, AppDispatch } from '../store';
import { Button } from '../components/UI';

export default function Login() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(login({ phoneNumber, password }));
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img
            src="/quckchat-icon.jpg"
            alt="QuckChat"
            className="w-16 h-16 rounded-xl mb-4 mx-auto"
          />
          <h1 className="text-2xl font-bold text-white">QuckApp Service URLs</h1>
          <p className="text-gray-400 mt-2">Sign in to manage service configurations</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>

          <p className="text-center text-gray-400 text-sm mt-4">
            Only admin accounts can access this panel
          </p>
        </form>
      </div>
    </div>
  );
}
