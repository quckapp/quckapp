import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge, Button, Modal } from '../components/UI';
import { fetchSystemHealth, updateSystemSettings, clearCache } from '../store/slices/systemSlice';
import { addToast } from '../store/slices/toastSlice';
import type { RootState, AppDispatch } from '../store';

export default function System() {
  const dispatch = useDispatch<AppDispatch>();
  const { health, settings, loading } = useSelector((state: RootState) => state.system);
  const { user } = useSelector((state: RootState) => state.auth);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editSettings, setEditSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    dispatch(fetchSystemHealth());

    const interval = setInterval(() => {
      dispatch(fetchSystemHealth());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setEditSettings({ ...settings });
    }
  }, [settings]);

  const handleRefresh = () => {
    dispatch(fetchSystemHealth());
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the system cache?')) {
      try {
        await dispatch(clearCache()).unwrap();
        dispatch(addToast({
          type: 'success',
          title: 'Cache cleared',
          message: 'System cache has been cleared successfully',
        }));
      } catch (error: any) {
        dispatch(addToast({
          type: 'error',
          title: 'Failed to clear cache',
          message: error.message || 'Please try again later',
        }));
      }
    }
  };

  const handleSaveSettings = async () => {
    try {
      await dispatch(updateSystemSettings(editSettings)).unwrap();
      dispatch(addToast({
        type: 'success',
        title: 'Settings saved',
        message: 'System settings have been updated successfully',
      }));
      setShowSettingsModal(false);
    } catch (error: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Failed to save settings',
        message: error.message || 'Please try again later',
      }));
    }
  };

  const getHealthStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div>
      <Header title="System Health" onRefresh={handleRefresh} loading={loading} />

      <div className="p-6">
        {/* Overall Status */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
            <Badge
              variant={
                health?.status === 'healthy'
                  ? 'success'
                  : health?.status === 'degraded'
                    ? 'warning'
                    : 'danger'
              }
            >
              {health?.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${health?.services?.api ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <Server
                  className={`w-5 h-5 ${health?.services?.api ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">API Server</p>
                <p
                  className={`text-xs ${health?.services?.api ? 'text-green-600' : 'text-red-600'}`}
                >
                  {health?.services?.api ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${health?.services?.database ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <Database
                  className={`w-5 h-5 ${health?.services?.database ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Database</p>
                <p
                  className={`text-xs ${health?.services?.database ? 'text-green-600' : 'text-red-600'}`}
                >
                  {health?.services?.database ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${health?.services?.redis ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <Activity
                  className={`w-5 h-5 ${health?.services?.redis ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Redis Cache</p>
                <p
                  className={`text-xs ${health?.services?.redis ? 'text-green-600' : 'text-red-600'}`}
                >
                  {health?.services?.redis ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${health?.services?.websocket ? 'bg-green-100' : 'bg-red-100'}`}
              >
                {health?.services?.websocket ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">WebSocket</p>
                <p
                  className={`text-xs ${health?.services?.websocket ? 'text-green-600' : 'text-red-600'}`}
                >
                  {health?.services?.websocket ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* CPU */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">CPU Usage</span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  getHealthStatus(health?.resources?.cpu || 0, { warning: 70, critical: 90 }) ===
                  'critical'
                    ? 'text-red-600'
                    : getHealthStatus(health?.resources?.cpu || 0, { warning: 70, critical: 90 }) ===
                        'warning'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {health?.resources?.cpu?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  getHealthStatus(health?.resources?.cpu || 0, { warning: 70, critical: 90 }) ===
                  'critical'
                    ? 'bg-red-500'
                    : getHealthStatus(health?.resources?.cpu || 0, { warning: 70, critical: 90 }) ===
                        'warning'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${health?.resources?.cpu || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-gray-900">Memory Usage</span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  getHealthStatus(health?.resources?.memory || 0, { warning: 75, critical: 90 }) ===
                  'critical'
                    ? 'text-red-600'
                    : getHealthStatus(health?.resources?.memory || 0, {
                          warning: 75,
                          critical: 90,
                        }) === 'warning'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {health?.resources?.memory?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  getHealthStatus(health?.resources?.memory || 0, { warning: 75, critical: 90 }) ===
                  'critical'
                    ? 'bg-red-500'
                    : getHealthStatus(health?.resources?.memory || 0, {
                          warning: 75,
                          critical: 90,
                        }) === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${health?.resources?.memory || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatBytes(health?.resources?.memoryUsed || 0)} /{' '}
              {formatBytes(health?.resources?.memoryTotal || 0)}
            </p>
          </div>

          {/* Disk */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <HardDrive className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-900">Disk Usage</span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  getHealthStatus(health?.resources?.disk || 0, { warning: 80, critical: 95 }) ===
                  'critical'
                    ? 'text-red-600'
                    : getHealthStatus(health?.resources?.disk || 0, { warning: 80, critical: 95 }) ===
                        'warning'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {health?.resources?.disk?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  getHealthStatus(health?.resources?.disk || 0, { warning: 80, critical: 95 }) ===
                  'critical'
                    ? 'bg-red-500'
                    : getHealthStatus(health?.resources?.disk || 0, { warning: 80, critical: 95 }) ===
                        'warning'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${health?.resources?.disk || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatBytes(health?.resources?.diskUsed || 0)} /{' '}
              {formatBytes(health?.resources?.diskTotal || 0)}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium text-gray-900">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {formatUptime(health?.uptime || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Node Version</span>
                <span className="font-medium text-gray-900">{health?.nodeVersion || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Active Connections</span>
                <span className="font-medium text-gray-900">
                  {health?.activeConnections?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Last Health Check</span>
                <span className="font-medium text-gray-900">
                  {health?.lastCheck ? new Date(health.lastCheck).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                onClick={handleClearCache}
                variant="secondary"
                className="w-full justify-start"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear System Cache
              </Button>
              {user?.role === 'super_admin' && (
                <Button
                  onClick={() => setShowSettingsModal(true)}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Server className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              )}
            </div>

            {/* Alerts */}
            {health?.alerts && health.alerts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Active Alerts</h4>
                <div className="space-y-2">
                  {health.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-sm text-red-700"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!health?.alerts || health.alerts.length === 0) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  No active alerts - System running smoothly
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Stats */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Statistics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Collections</p>
              <p className="text-2xl font-bold text-gray-900">
                {health?.database?.collections || 0}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">
                {health?.database?.documents?.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Data Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(health?.database?.dataSize || 0)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Index Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(health?.database?.indexSize || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="System Settings"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            These settings affect the entire system. Make changes carefully.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Upload Size (MB)
            </label>
            <input
              type="number"
              value={(editSettings.maxUploadSize as number) || 10}
              onChange={(e) =>
                setEditSettings({ ...editSettings, maxUploadSize: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={(editSettings.sessionTimeout as number) || 60}
              onChange={(e) =>
                setEditSettings({ ...editSettings, sessionTimeout: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
