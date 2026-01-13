import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Globe,
  Database,
  Upload,
  Download,
  Save,
  RefreshCw,
  Mail,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Button, Badge } from '../components/UI';
import { fetchSettings, updateSettings, exportData, importData } from '../store/slices/settingsSlice';
import type { RootState, AppDispatch } from '../store';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
}

const SECTIONS: SettingsSection[] = [
  { id: 'general', title: 'General', icon: Globe, description: 'App name, timezone, and basic settings' },
  { id: 'security', title: 'Security', icon: Shield, description: 'Authentication and security policies' },
  { id: 'notifications', title: 'Notifications', icon: Bell, description: 'Push notification settings' },
  { id: 'messaging', title: 'Messaging', icon: MessageSquare, description: 'Message limits and features' },
  { id: 'storage', title: 'Storage', icon: Database, description: 'File upload and storage limits' },
  { id: 'export', title: 'Export/Import', icon: Download, description: 'Backup and restore data' },
];

export default function Settings() {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, loading, saveLoading } = useSelector((state: RootState) => state.settings);
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeSection, setActiveSection] = useState('general');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await dispatch(updateSettings(formData));
    setHasChanges(false);
  };

  const handleExport = async (type: 'users' | 'messages' | 'all') => {
    setExportLoading(true);
    try {
      await dispatch(exportData(type));
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    await dispatch(importData(formData));
    setImportFile(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
              <input
                type="text"
                value={formData.appName || 'QuckChat'}
                onChange={(e) => handleChange('appName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={formData.supportEmail || ''}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
              <select
                value={formData.defaultLanguage || 'en'}
                onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={formData.timezone || 'UTC'}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-500">Disable access for non-admin users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.maintenanceMode || false}
                  onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={formData.sessionTimeout || 60}
                onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={formData.maxLoginAttempts || 5}
                onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.lockoutDuration || 15}
                onChange={(e) => handleChange('lockoutDuration', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.require2FA || false}
                  onChange={(e) => handleChange('require2FA', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Email Verification Required</p>
                <p className="text-sm text-gray-500">Users must verify email before accessing</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireEmailVerification || false}
                  onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Enable push notifications for users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pushNotificationsEnabled || true}
                  onChange={(e) => handleChange('pushNotificationsEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Send email notifications for important events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emailNotificationsEnabled || true}
                  onChange={(e) => handleChange('emailNotificationsEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Rate Limit (per hour)
              </label>
              <input
                type="number"
                value={formData.notificationRateLimit || 100}
                onChange={(e) => handleChange('notificationRateLimit', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        );

      case 'messaging':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Message Length
              </label>
              <input
                type="number"
                value={formData.maxMessageLength || 5000}
                onChange={(e) => handleChange('maxMessageLength', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Group Size
              </label>
              <input
                type="number"
                value={formData.maxGroupSize || 256}
                onChange={(e) => handleChange('maxGroupSize', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Retention (days, 0 = forever)
              </label>
              <input
                type="number"
                value={formData.messageRetentionDays || 0}
                onChange={(e) => handleChange('messageRetentionDays', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Message Editing</p>
                <p className="text-sm text-gray-500">Allow users to edit sent messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.messageEditingEnabled || true}
                  onChange={(e) => handleChange('messageEditingEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Message Deletion</p>
                <p className="text-sm text-gray-500">Allow users to delete sent messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.messageDeletionEnabled || true}
                  onChange={(e) => handleChange('messageDeletionEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Read Receipts</p>
                <p className="text-sm text-gray-500">Show when messages are read</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.readReceiptsEnabled || true}
                  onChange={(e) => handleChange('readReceiptsEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max File Upload Size (MB)
              </label>
              <input
                type="number"
                value={formData.maxUploadSize || 25}
                onChange={(e) => handleChange('maxUploadSize', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Video Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.maxVideoDuration || 180}
                onChange={(e) => handleChange('maxVideoDuration', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed File Types
              </label>
              <input
                type="text"
                value={formData.allowedFileTypes || 'jpg,jpeg,png,gif,mp4,mp3,pdf,doc,docx'}
                onChange={(e) => handleChange('allowedFileTypes', e.target.value)}
                placeholder="jpg,png,pdf,..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of extensions</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Image Compression</p>
                <p className="text-sm text-gray-500">Automatically compress uploaded images</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.imageCompressionEnabled || true}
                  onChange={(e) => handleChange('imageCompressionEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Data Export/Import</p>
                  <p className="text-sm text-blue-700">
                    Export data for backup or import previously exported data. This feature is only
                    available to super admins.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Export Data</h4>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleExport('users')}
                  disabled={!isSuperAdmin || exportLoading}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium text-gray-900">Users</p>
                  <p className="text-xs text-gray-500">Export all user data</p>
                </button>
                <button
                  onClick={() => handleExport('messages')}
                  disabled={!isSuperAdmin || exportLoading}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium text-gray-900">Messages</p>
                  <p className="text-xs text-gray-500">Export all messages</p>
                </button>
                <button
                  onClick={() => handleExport('all')}
                  disabled={!isSuperAdmin || exportLoading}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium text-gray-900">Full Backup</p>
                  <p className="text-xs text-gray-500">Export everything</p>
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Import Data</h4>
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drop a backup file here or click to select
                </p>
                <input
                  type="file"
                  accept=".json,.zip"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="import-file"
                  disabled={!isSuperAdmin}
                />
                <label
                  htmlFor="import-file"
                  className={`inline-block px-4 py-2 bg-gray-100 rounded-lg text-sm cursor-pointer hover:bg-gray-200 ${
                    !isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Select File
                </label>
                {importFile && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">{importFile.name}</p>
                    <Button onClick={handleImport} className="mt-2" size="sm">
                      Import Data
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <Header
        title="Settings"
        onRefresh={() => dispatch(fetchSettings())}
        loading={loading}
        actions={
          hasChanges && (
            <Button onClick={handleSave} disabled={saveLoading}>
              <Save className="w-4 h-4 mr-2" />
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          )
        }
      />

      <div className="p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors ${
                    activeSection === section.id ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                  }`}
                >
                  <section.icon
                    className={`w-5 h-5 ${
                      activeSection === section.id ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        activeSection === section.id ? 'text-primary-600' : 'text-gray-900'
                      }`}
                    >
                      {section.title}
                    </p>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {SECTIONS.find((s) => s.id === activeSection)?.title} Settings
              </h3>
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
