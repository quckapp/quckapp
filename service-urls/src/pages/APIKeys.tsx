import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus,
  Trash2,
  ShieldOff,
  Key,
  Copy,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Button, Badge, Modal } from '../components/UI';
import {
  fetchAPIKeys,
  createAPIKey,
  revokeAPIKey,
  deleteAPIKey,
} from '../store/slices/apiKeysSlice';
import { showSuccessToast, showErrorToast } from '../store/slices/toastSlice';
import { ENVIRONMENTS, ENVIRONMENT_LABELS } from '../types';
import type { ConfigAPIKey, CreateAPIKeyRequest } from '../types';
import type { RootState, AppDispatch } from '../store';

export default function APIKeys() {
  const dispatch = useDispatch<AppDispatch>();
  const { keys, loading, saveLoading } = useSelector((state: RootState) => state.apiKeys);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [createForm, setCreateForm] = useState<CreateAPIKeyRequest>({
    name: '',
    description: '',
    serviceName: '',
    environments: [],
  });
  const [allEnvs, setAllEnvs] = useState(true);

  useEffect(() => {
    dispatch(fetchAPIKeys());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchAPIKeys());
  };

  const openCreateModal = () => {
    setCreateForm({ name: '', description: '', serviceName: '', environments: [] });
    setAllEnvs(true);
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      dispatch(showErrorToast('Name is required'));
      return;
    }

    const data: CreateAPIKeyRequest = {
      name: createForm.name.trim(),
      description: createForm.description?.trim() || undefined,
      serviceName: createForm.serviceName?.trim() || undefined,
      environments: allEnvs ? undefined : createForm.environments,
    };

    try {
      const result = await dispatch(createAPIKey(data)).unwrap();
      setNewKeyValue(result.key);
      setShowCreateModal(false);
      setShowKeyModal(true);
      dispatch(showSuccessToast('API key created'));
    } catch {
      dispatch(showErrorToast('Failed to create API key'));
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKeyValue);
      dispatch(showSuccessToast('API key copied to clipboard'));
    } catch {
      dispatch(showErrorToast('Failed to copy key'));
    }
  };

  const handleRevoke = async (key: ConfigAPIKey) => {
    if (!confirm(`Revoke API key "${key.name}"? This will immediately disable all access using this key.`)) return;
    try {
      await dispatch(revokeAPIKey(key.id)).unwrap();
      dispatch(showSuccessToast('API key revoked'));
    } catch {
      dispatch(showErrorToast('Failed to revoke API key'));
    }
  };

  const handleDelete = async (key: ConfigAPIKey) => {
    if (!confirm(`Permanently delete API key "${key.name}"? This action cannot be undone.`)) return;
    try {
      await dispatch(deleteAPIKey(key.id)).unwrap();
      dispatch(showSuccessToast('API key deleted'));
    } catch {
      dispatch(showErrorToast('Failed to delete API key'));
    }
  };

  const toggleEnv = (env: string) => {
    const envs = createForm.environments || [];
    if (envs.includes(env)) {
      setCreateForm({ ...createForm, environments: envs.filter((e) => e !== env) });
    } else {
      setCreateForm({ ...createForm, environments: [...envs, env] });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeKeys = keys.filter((k) => k.isActive);
  const revokedKeys = keys.filter((k) => !k.isActive);

  return (
    <div>
      <Header
        title="API Keys"
        onRefresh={handleRefresh}
        loading={loading}
        actions={
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1" /> Create API Key
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Key className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Config API Authentication</p>
            <p className="text-blue-600 mt-1">
              API keys are used by microservices to fetch their configuration from the{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">/api/v1/config/:env/*</code>{' '}
              endpoints. Each key can be scoped to specific environments and services.
            </p>
          </div>
        </div>

        {/* Active Keys */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <h3 className="font-medium text-gray-900">Active Keys ({activeKeys.length})</h3>
            </div>
          </div>

          {activeKeys.length === 0 ? (
            <div className="p-8 text-center">
              <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">No active API keys.</p>
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-1" /> Create First Key
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeKeys.map((key) => (
                <div key={key.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{key.name}</span>
                        <Badge variant="success" size="sm">Active</Badge>
                        {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                          <Badge variant="danger" size="sm">Expired</Badge>
                        )}
                      </div>

                      {key.description && (
                        <p className="text-sm text-gray-500 mb-2">{key.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded">{key.keyPrefix}...</code>
                        </span>

                        {key.serviceName && (
                          <span>Service: <strong className="text-gray-600">{key.serviceName}</strong></span>
                        )}

                        <span className="flex items-center gap-1">
                          Environments:{' '}
                          {key.environments.includes('*') ? (
                            <Badge variant="info" size="sm">All</Badge>
                          ) : (
                            key.environments.map((e) => (
                              <Badge key={e} variant="default" size="sm">{e}</Badge>
                            ))
                          )}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last used: {formatDate(key.lastUsedAt)}
                        </span>

                        <span>Created: {formatDate(key.createdAt)}</span>

                        {key.expiresAt && (
                          <span>Expires: {formatDate(key.expiresAt)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleRevoke(key)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                        title="Revoke key"
                      >
                        <ShieldOff className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(key)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revoked Keys */}
        {revokedKeys.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <h3 className="font-medium text-gray-500">Revoked Keys ({revokedKeys.length})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {revokedKeys.map((key) => (
                <div key={key.id} className="px-4 py-3 hover:bg-gray-50 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-600 line-through">{key.name}</span>
                          <Badge variant="default" size="sm">Revoked</Badge>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded">{key.keyPrefix}...</code>
                          {key.serviceName && <span>Service: {key.serviceName}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(key)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Guide */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
          <h3 className="font-medium text-gray-900 mb-3">Usage</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">Go services (go-configloader):</p>
              <code className="block bg-gray-800 text-green-400 px-3 py-2 rounded text-xs">
                CONFIG_API_KEY=qk_your_key_here
              </code>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Shell / curl:</p>
              <code className="block bg-gray-800 text-green-400 px-3 py-2 rounded text-xs">
                curl -H "X-API-Key: qk_your_key_here" http://service-urls-api:8085/api/v1/config/development/env-file
              </code>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Non-Go services (fetch-config.sh):</p>
              <code className="block bg-gray-800 text-green-400 px-3 py-2 rounded text-xs">
                CONFIG_API_KEY=qk_your_key_here CONFIG_ENV=development SERVICE_URLS_API=http://service-urls-api:8085
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create API Key Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create API Key"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Production Deploy Key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={createForm.description || ''}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="What this key is used for"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <input
              type="text"
              value={createForm.serviceName || ''}
              onChange={(e) => setCreateForm({ ...createForm, serviceName: e.target.value })}
              placeholder="e.g. workspace-service (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">Used as prefix in the key (e.g. qk_workspace_...)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Environment Access</label>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={allEnvs}
                onChange={(e) => setAllEnvs(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">All environments</span>
            </label>
            {!allEnvs && (
              <div className="flex flex-wrap gap-2">
                {ENVIRONMENTS.map((env) => (
                  <button
                    key={env}
                    onClick={() => toggleEnv(env)}
                    className={`px-3 py-1.5 text-xs rounded-full transition-colors border ${
                      (createForm.environments || []).includes(env)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {ENVIRONMENT_LABELS[env]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>The API key will be shown only once after creation. Make sure to copy it immediately.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saveLoading}>
              Create Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── New Key Display Modal ── */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => { setShowKeyModal(false); setNewKeyValue(''); }}
        title="API Key Created"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Your API key has been created. Copy it now — it won't be shown again.</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-gray-900 break-all">{newKeyValue}</code>
              <button
                onClick={handleCopyKey}
                className="ml-3 p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded flex-shrink-0"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => { setShowKeyModal(false); setNewKeyValue(''); }}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
