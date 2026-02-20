import { useEffect, useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Copy,
  ExternalLink,
  Server,
  Flame as FlameIcon,
  RefreshCw,
  Search,
  LayoutGrid,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  FileCode,
  ChevronDown,
  ClipboardCopy,
  FileJson,
  FileText,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Button, Badge, Modal } from '../components/UI';
import api from '../services/api';
import {
  fetchServices,
  fetchInfrastructure,
  fetchFirebase,
  createService,
  updateService,
  deleteService,
  createInfrastructure,
  updateInfrastructure,
  deleteInfrastructure,
  upsertFirebase,
  bulkExport,
  bulkImport,
  cloneEnvironment,
  clearEnvironmentData,
  fetchSecrets,
  upsertSecret,
  deleteSecret,
  upsertSecretsBatch,
} from '../store/slices/serviceUrlsSlice';
import { showSuccessToast, showErrorToast } from '../store/slices/toastSlice';
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type Environment,
  type ServiceCategory,
  type ServiceUrlConfig,
  type InfrastructureConfig,
  type SecretConfig,
  type SecretCategory,
  SECRET_CATEGORY_LABELS,
  SECRET_CATEGORY_COLORS,
  SECRET_TEMPLATES,
} from '../types';
import type { RootState, AppDispatch } from '../store';

type ActiveSection = 'overview' | ServiceCategory | 'infrastructure' | 'secrets' | 'firebase';

const SECTIONS: { key: ActiveSection; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'SPRING', label: 'Spring Boot' },
  { key: 'NESTJS', label: 'NestJS' },
  { key: 'ELIXIR', label: 'Elixir' },
  { key: 'GO', label: 'Go' },
  { key: 'PYTHON', label: 'Python' },
  { key: 'WEB', label: 'Web' },
  { key: 'MOBILE', label: 'Mobile' },
  { key: 'CDN', label: 'CDN / Static' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'secrets', label: 'Secrets & Config' },
  { key: 'firebase', label: 'Firebase' },
];

export default function EnvironmentDetail() {
  const { envName } = useParams<{ envName: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { services, infrastructure, firebase, secrets, loading, saveLoading } = useSelector(
    (state: RootState) => state.serviceUrls
  );

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInfraModal, setShowInfraModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceUrlConfig | null>(null);
  const [editingInfra, setEditingInfra] = useState<InfrastructureConfig | null>(null);

  // Form states
  const [serviceForm, setServiceForm] = useState({
    serviceKey: '',
    category: 'SPRING' as ServiceCategory,
    url: '',
    description: '',
  });
  const [infraForm, setInfraForm] = useState({
    infraKey: '',
    host: '',
    port: 0,
    username: '',
    password: '',
    connectionString: '',
  });
  const [firebaseForm, setFirebaseForm] = useState({
    projectId: '',
    clientEmail: '',
    privateKey: '',
    storageBucket: '',
  });
  const [importData, setImportData] = useState('');
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretConfig | null>(null);
  const [secretForm, setSecretForm] = useState({
    secretKey: '',
    category: 'AUTH' as SecretCategory,
    value: '',
    description: '',
    isRequired: false,
  });
  const [showSecretValues, setShowSecretValues] = useState<Record<string, boolean>>({});
  const [activeSecretCategory, setActiveSecretCategory] = useState<SecretCategory | 'all'>('all');
  const [showTemplateSetup, setShowTemplateSetup] = useState(false);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [cloneTarget, setCloneTarget] = useState<Environment>('qa');
  const [cloneOverwrite, setCloneOverwrite] = useState(false);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);

  const env = envName as Environment;

  if (!ENVIRONMENTS.includes(env)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    dispatch(clearEnvironmentData());
    dispatch(fetchServices({ env }));
    dispatch(fetchInfrastructure(env));
    dispatch(fetchFirebase(env));
    dispatch(fetchSecrets({ env }));
  }, [dispatch, env]);

  const handleRefresh = () => {
    dispatch(fetchServices({ env }));
    dispatch(fetchInfrastructure(env));
    dispatch(fetchFirebase(env));
    dispatch(fetchSecrets({ env }));
  };

  // ── Service CRUD ──

  const openAddService = (category?: ServiceCategory) => {
    setEditingService(null);
    setServiceForm({
      serviceKey: '',
      category: category || 'SPRING',
      url: '',
      description: '',
    });
    setShowServiceModal(true);
  };

  const openEditService = (svc: ServiceUrlConfig) => {
    setEditingService(svc);
    setServiceForm({
      serviceKey: svc.serviceKey,
      category: svc.category,
      url: svc.url,
      description: svc.description,
    });
    setShowServiceModal(true);
  };

  const handleSaveService = async () => {
    try {
      if (editingService) {
        await dispatch(updateService({ env, serviceKey: editingService.serviceKey, data: serviceForm })).unwrap();
        dispatch(showSuccessToast('Service updated'));
      } else {
        await dispatch(createService({ env, data: serviceForm })).unwrap();
        dispatch(showSuccessToast('Service created'));
      }
      setShowServiceModal(false);
      dispatch(fetchServices({ env }));
    } catch {
      dispatch(showErrorToast('Failed to save service'));
    }
  };

  const handleDeleteService = async (serviceKey: string) => {
    if (!confirm(`Delete service "${serviceKey}"?`)) return;
    try {
      await dispatch(deleteService({ env, serviceKey })).unwrap();
      dispatch(showSuccessToast('Service deleted'));
    } catch {
      dispatch(showErrorToast('Failed to delete service'));
    }
  };

  // ── Infrastructure CRUD ──

  const openAddInfra = () => {
    setEditingInfra(null);
    setInfraForm({ infraKey: '', host: '', port: 0, username: '', password: '', connectionString: '' });
    setShowInfraModal(true);
  };

  const openEditInfra = (infra: InfrastructureConfig) => {
    setEditingInfra(infra);
    setInfraForm({
      infraKey: infra.infraKey,
      host: infra.host,
      port: infra.port,
      username: infra.username || '',
      password: '',
      connectionString: infra.connectionString || '',
    });
    setShowInfraModal(true);
  };

  const handleSaveInfra = async () => {
    try {
      if (editingInfra) {
        await dispatch(updateInfrastructure({ env, infraKey: editingInfra.infraKey, data: infraForm })).unwrap();
        dispatch(showSuccessToast('Infrastructure updated'));
      } else {
        await dispatch(createInfrastructure({ env, data: infraForm })).unwrap();
        dispatch(showSuccessToast('Infrastructure created'));
      }
      setShowInfraModal(false);
      dispatch(fetchInfrastructure(env));
    } catch {
      dispatch(showErrorToast('Failed to save infrastructure'));
    }
  };

  const handleDeleteInfra = async (infraKey: string) => {
    if (!confirm(`Delete infrastructure "${infraKey}"?`)) return;
    try {
      await dispatch(deleteInfrastructure({ env, infraKey })).unwrap();
      dispatch(showSuccessToast('Infrastructure deleted'));
    } catch {
      dispatch(showErrorToast('Failed to delete infrastructure'));
    }
  };

  // ── Firebase ──

  const openFirebaseModal = () => {
    setFirebaseForm({
      projectId: firebase?.projectId || '',
      clientEmail: firebase?.clientEmail || '',
      privateKey: '',
      storageBucket: firebase?.storageBucket || '',
    });
    setShowFirebaseModal(true);
  };

  const handleSaveFirebase = async () => {
    try {
      await dispatch(upsertFirebase({ env, data: firebaseForm })).unwrap();
      dispatch(showSuccessToast('Firebase config saved'));
      setShowFirebaseModal(false);
    } catch {
      dispatch(showErrorToast('Failed to save Firebase config'));
    }
  };

  // ── Secrets ──

  const openAddSecret = () => {
    setEditingSecret(null);
    setSecretForm({ secretKey: '', category: 'AUTH', value: '', description: '', isRequired: false });
    setShowSecretModal(true);
  };

  const openEditSecret = (secret: SecretConfig) => {
    setEditingSecret(secret);
    setSecretForm({
      secretKey: secret.secretKey,
      category: secret.category,
      value: '',
      description: secret.description,
      isRequired: secret.isRequired,
    });
    setShowSecretModal(true);
  };

  const handleSaveSecret = async () => {
    try {
      await dispatch(upsertSecret({ env, data: secretForm })).unwrap();
      dispatch(showSuccessToast('Secret saved'));
      setShowSecretModal(false);
      dispatch(fetchSecrets({ env }));
    } catch {
      dispatch(showErrorToast('Failed to save secret'));
    }
  };

  const handleDeleteSecret = async (secretKey: string) => {
    if (!confirm(`Delete secret "${secretKey}"?`)) return;
    try {
      await dispatch(deleteSecret({ env, secretKey })).unwrap();
      dispatch(showSuccessToast('Secret deleted'));
    } catch {
      dispatch(showErrorToast('Failed to delete secret'));
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecretValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openTemplateSetup = () => {
    const values: Record<string, string> = {};
    for (const t of SECRET_TEMPLATES) {
      const existing = secrets.find((s) => s.secretKey === t.secretKey);
      values[t.secretKey] = existing ? '' : '';
    }
    setTemplateValues(values);
    setShowTemplateSetup(true);
  };

  const handleSaveAllTemplates = async () => {
    const batch = SECRET_TEMPLATES
      .filter((t) => templateValues[t.secretKey]?.trim())
      .map((t) => ({
        secretKey: t.secretKey,
        category: t.category,
        value: templateValues[t.secretKey].trim(),
        description: t.description,
        isRequired: t.isRequired,
      }));

    if (batch.length === 0) {
      dispatch(showErrorToast('No values to save'));
      return;
    }

    try {
      await dispatch(upsertSecretsBatch({ env, data: batch })).unwrap();
      dispatch(showSuccessToast(`${batch.length} secrets saved`));
      setShowTemplateSetup(false);
      dispatch(fetchSecrets({ env }));
    } catch {
      dispatch(showErrorToast('Failed to save secrets'));
    }
  };

  const filteredSecrets = useMemo(() => {
    if (activeSecretCategory === 'all') return secrets;
    return secrets.filter((s) => s.category === activeSecretCategory);
  }, [secrets, activeSecretCategory]);

  // ── Bulk Operations ──

  const handleExport = () => {
    dispatch(bulkExport(env));
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importData);
      await dispatch(bulkImport({ env, data: parsed })).unwrap();
      dispatch(showSuccessToast('Import successful'));
      setShowImportModal(false);
      setImportData('');
      handleRefresh();
    } catch {
      dispatch(showErrorToast('Failed to import data. Check JSON format.'));
    }
  };

  const handleClone = async () => {
    try {
      await dispatch(cloneEnvironment({ sourceEnv: env, targetEnv: cloneTarget, overwrite: cloneOverwrite })).unwrap();
      dispatch(showSuccessToast(`Cloned to ${ENVIRONMENT_LABELS[cloneTarget]}`));
      setShowCloneModal(false);
    } catch {
      dispatch(showErrorToast('Failed to clone environment'));
    }
  };

  // ── Generate Config (uses api instance which adds JWT Bearer token automatically) ──

  const handleDownloadEnvFile = async () => {
    setShowGenerateMenu(false);
    try {
      const res = await api.get(`/config/${env}/env-file`, {
        responseType: 'text',
        transformResponse: [(data: string) => data],
      });
      const blob = new Blob([res.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${env}.env`;
      link.click();
      URL.revokeObjectURL(url);
      dispatch(showSuccessToast('Downloaded .env file'));
    } catch {
      dispatch(showErrorToast('Failed to generate .env file'));
    }
  };

  const handleCopyDockerCompose = async () => {
    setShowGenerateMenu(false);
    try {
      const res = await api.get(`/config/${env}/docker-compose`, {
        responseType: 'text',
        transformResponse: [(data: string) => data],
      });
      await navigator.clipboard.writeText(res.data);
      dispatch(showSuccessToast('Docker Compose config copied to clipboard'));
    } catch {
      dispatch(showErrorToast('Failed to copy Docker Compose config'));
    }
  };

  const handleCopyJSON = async () => {
    setShowGenerateMenu(false);
    try {
      const res = await api.get(`/config/${env}/json`);
      await navigator.clipboard.writeText(JSON.stringify(res.data, null, 2));
      dispatch(showSuccessToast('JSON config copied to clipboard'));
    } catch {
      dispatch(showErrorToast('Failed to copy JSON config'));
    }
  };

  const handleCopyKongConfig = async () => {
    setShowGenerateMenu(false);
    try {
      const res = await api.get(`/config/${env}/kong`, {
        responseType: 'text',
        transformResponse: [(data: string) => data],
      });
      await navigator.clipboard.writeText(res.data);
      dispatch(showSuccessToast('Kong config copied to clipboard'));
    } catch {
      dispatch(showErrorToast('Failed to copy Kong config'));
    }
  };

  // ── Filtering ──

  const filteredServices = useMemo(() => {
    let filtered = services;
    if (activeSection !== 'overview' && activeSection !== 'infrastructure' && activeSection !== 'secrets' && activeSection !== 'firebase') {
      filtered = filtered.filter((s) => s.category === activeSection);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.serviceKey.toLowerCase().includes(q) ||
          s.url.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [services, activeSection, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of services) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [services]);

  // ── Render Sections ──

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Services</p>
          <p className="text-2xl font-bold text-gray-900">{services.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Infrastructure</p>
          <p className="text-2xl font-bold text-gray-900">{infrastructure.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Firebase</p>
          <p className="text-2xl font-bold text-gray-900">{firebase ? 'Configured' : 'Not Set'}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Secrets</p>
          <p className="text-2xl font-bold text-gray-900">{secrets.length}</p>
        </div>
      </div>

      {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
        const catServices = services.filter((s) => s.category === cat);
        if (catServices.length === 0) return null;
        return (
          <div key={cat} className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" size="sm">
                  <span className={CATEGORY_COLORS[cat as ServiceCategory]?.split(' ')[1]}>{label}</span>
                </Badge>
                <span className="text-sm text-gray-400">{catServices.length} services</span>
              </div>
              <button
                onClick={() => setActiveSection(cat as ServiceCategory)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {catServices.slice(0, 3).map((svc) => (
                <div key={svc.serviceKey} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{svc.serviceKey}</span>
                    <span className="text-xs text-gray-400 ml-2">{svc.description}</span>
                  </div>
                  <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">{svc.url}</code>
                </div>
              ))}
              {catServices.length > 3 && (
                <div className="px-4 py-2 text-xs text-gray-400">
                  +{catServices.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderServicesTable = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          {activeSection !== 'overview' && activeSection !== 'infrastructure' && activeSection !== 'secrets' && activeSection !== 'firebase'
            ? CATEGORY_LABELS[activeSection as ServiceCategory]
            : 'All'}{' '}
          Services ({filteredServices.length})
        </h3>
        <Button size="sm" onClick={() => openAddService(activeSection as ServiceCategory)}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {filteredServices.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          No services found. Click "Add" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredServices.map((svc) => (
                <tr key={svc.serviceKey} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{svc.serviceKey}</span>
                      {svc.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{svc.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded max-w-xs truncate block">
                        {svc.url}
                      </code>
                      <a
                        href={svc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        svc.category === 'SPRING' ? 'success' :
                        svc.category === 'NESTJS' ? 'danger' :
                        svc.category === 'ELIXIR' ? 'purple' :
                        svc.category === 'GO' ? 'info' : 'warning'
                      }
                      size="sm"
                    >
                      {CATEGORY_LABELS[svc.category]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={svc.isActive ? 'success' : 'default'} size="sm">
                      {svc.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditService(svc)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(svc.serviceKey)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderInfrastructure = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Infrastructure ({infrastructure.length})</h3>
        <Button size="sm" onClick={openAddInfra}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {infrastructure.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          No infrastructure configured. Click "Add" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infrastructure.map((infra) => (
            <div key={infra.infraKey} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{infra.infraKey}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={infra.isActive ? 'success' : 'default'} size="sm">
                    {infra.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <button
                    onClick={() => openEditInfra(infra)}
                    className="p-1 text-gray-400 hover:text-primary-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteInfra(infra.infraKey)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Host</span>
                  <code className="text-gray-700">{infra.host}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Port</span>
                  <code className="text-gray-700">{infra.port}</code>
                </div>
                {infra.username && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">User</span>
                    <code className="text-gray-700">{infra.username}</code>
                  </div>
                )}
                {infra.connectionString && (
                  <div className="mt-2">
                    <span className="text-gray-500 text-xs">Connection String</span>
                    <code className="block text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 break-all">
                      {infra.connectionString}
                    </code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFirebase = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Firebase Configuration</h3>
        <Button size="sm" onClick={openFirebaseModal}>
          <Pencil className="w-4 h-4 mr-1" /> {firebase ? 'Edit' : 'Configure'}
        </Button>
      </div>

      {firebase ? (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FlameIcon className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-gray-900">Firebase Project</span>
            <Badge variant={firebase.isActive ? 'success' : 'default'} size="sm">
              {firebase.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Project ID</span>
              <p className="font-mono text-gray-900">{firebase.projectId}</p>
            </div>
            <div>
              <span className="text-gray-500">Storage Bucket</span>
              <p className="font-mono text-gray-900">{firebase.storageBucket}</p>
            </div>
            <div>
              <span className="text-gray-500">Client Email</span>
              <p className="font-mono text-gray-900 text-xs break-all">{firebase.clientEmail}</p>
            </div>
            <div>
              <span className="text-gray-500">Private Key</span>
              <p className="font-mono text-gray-500 text-xs">{firebase.privateKeyMasked}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          No Firebase configuration set for this environment.
        </div>
      )}
    </div>
  );

  const renderSecrets = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Secrets & Configuration ({secrets.length})</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={openTemplateSetup}>
            <Shield className="w-4 h-4 mr-1" /> Quick Setup
          </Button>
          <Button size="sm" onClick={openAddSecret}>
            <Plus className="w-4 h-4 mr-1" /> Add Secret
          </Button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSecretCategory('all')}
          className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
            activeSecretCategory === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({secrets.length})
        </button>
        {(Object.entries(SECRET_CATEGORY_LABELS) as [SecretCategory, string][]).map(([cat, label]) => {
          const count = secrets.filter((s) => s.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveSecretCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                activeSecretCategory === cat
                  ? 'bg-gray-900 text-white'
                  : `${SECRET_CATEGORY_COLORS[cat]} hover:opacity-80`
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Secrets list */}
      {filteredSecrets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <KeyRound className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 mb-3">No secrets configured yet.</p>
          <Button size="sm" onClick={openTemplateSetup}>
            <Shield className="w-4 h-4 mr-1" /> Quick Setup with Templates
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSecrets.map((secret) => (
                <tr key={secret.secretKey} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900 font-mono text-xs">{secret.secretKey}</span>
                      {secret.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{secret.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded max-w-[200px] truncate block font-mono">
                        {showSecretValues[secret.secretKey] ? secret.value : secret.valueMasked}
                      </code>
                      <button
                        onClick={() => toggleSecretVisibility(secret.secretKey)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {showSecretValues[secret.secretKey] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default" size="sm">
                      <span className={SECRET_CATEGORY_COLORS[secret.category]?.split(' ')[1]}>
                        {SECRET_CATEGORY_LABELS[secret.category]}
                      </span>
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {secret.isRequired ? (
                      <Badge variant="danger" size="sm">Required</Badge>
                    ) : (
                      <Badge variant="default" size="sm">Optional</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditSecret(secret)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSecret(secret.secretKey)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'infrastructure':
        return renderInfrastructure();
      case 'secrets':
        return renderSecrets();
      case 'firebase':
        return renderFirebase();
      default:
        return renderServicesTable();
    }
  };

  return (
    <div>
      <Header
        title={ENVIRONMENT_LABELS[env]}
        onRefresh={handleRefresh}
        loading={loading}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowCloneModal(true)}>
              <Copy className="w-4 h-4 mr-1" /> Clone
            </Button>
            <div className="relative">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowGenerateMenu(!showGenerateMenu)}
              >
                <FileCode className="w-4 h-4 mr-1" /> Generate
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              {showGenerateMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowGenerateMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={handleDownloadEnvFile}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-700">Download .env</div>
                        <div className="text-xs text-gray-400">Environment file for services</div>
                      </div>
                    </button>
                    <button
                      onClick={handleCopyDockerCompose}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <ClipboardCopy className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-700">Copy Docker Compose</div>
                        <div className="text-xs text-gray-400">YAML environment block</div>
                      </div>
                    </button>
                    <button
                      onClick={handleCopyJSON}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileJson className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-700">Copy JSON Config</div>
                        <div className="text-xs text-gray-400">Flat key-value JSON map</div>
                      </div>
                    </button>
                    <button
                      onClick={handleCopyKongConfig}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Server className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-700">Copy Kong Config</div>
                        <div className="text-xs text-gray-400">Kong declarative YAML</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      <div className="flex">
        {/* Left sidebar - category navigation */}
        <div className="w-56 min-h-[calc(100vh-8rem)] bg-white border-r border-gray-200 p-3">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <ul className="space-y-0.5">
            {SECTIONS.map(({ key, label }) => (
              <li key={key}>
                <button
                  onClick={() => setActiveSection(key)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === key
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {key === 'overview' && <LayoutGrid className="w-4 h-4" />}
                    {key === 'infrastructure' && <Server className="w-4 h-4" />}
                    {key === 'secrets' && <KeyRound className="w-4 h-4" />}
                    {key === 'firebase' && <FlameIcon className="w-4 h-4" />}
                    {key !== 'overview' && key !== 'infrastructure' && key !== 'secrets' && key !== 'firebase' && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          CATEGORY_COLORS[key as ServiceCategory]?.split(' ')[0] || 'bg-gray-300'
                        }`}
                      />
                    )}
                    <span>{label}</span>
                  </div>
                  {key !== 'overview' && key !== 'infrastructure' && key !== 'secrets' && key !== 'firebase' && (
                    <span className="text-xs text-gray-400">{categoryCounts[key] || 0}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6">
          {loading && services.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {/* ── Service Modal ── */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title={editingService ? 'Edit Service' : 'Add Service'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Key</label>
            <input
              type="text"
              value={serviceForm.serviceKey}
              onChange={(e) => setServiceForm({ ...serviceForm, serviceKey: e.target.value })}
              disabled={!!editingService}
              placeholder="e.g. auth-service"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={serviceForm.category}
              onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as ServiceCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="text"
              value={serviceForm.url}
              onChange={(e) => setServiceForm({ ...serviceForm, url: e.target.value })}
              placeholder="http://localhost:8080"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              placeholder="Brief description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowServiceModal(false)}>Cancel</Button>
            <Button onClick={handleSaveService} loading={saveLoading}>
              {editingService ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Infrastructure Modal ── */}
      <Modal
        isOpen={showInfraModal}
        onClose={() => setShowInfraModal(false)}
        title={editingInfra ? 'Edit Infrastructure' : 'Add Infrastructure'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Infrastructure Key</label>
            <input
              type="text"
              value={infraForm.infraKey}
              onChange={(e) => setInfraForm({ ...infraForm, infraKey: e.target.value })}
              disabled={!!editingInfra}
              placeholder="e.g. mysql-primary"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={infraForm.host}
                onChange={(e) => setInfraForm({ ...infraForm, host: e.target.value })}
                placeholder="localhost"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={infraForm.port}
                onChange={(e) => setInfraForm({ ...infraForm, port: parseInt(e.target.value) || 0 })}
                placeholder="3306"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={infraForm.username}
              onChange={(e) => setInfraForm({ ...infraForm, username: e.target.value })}
              placeholder="root"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={infraForm.password}
              onChange={(e) => setInfraForm({ ...infraForm, password: e.target.value })}
              placeholder={editingInfra ? 'Leave blank to keep current' : 'Enter password'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Connection String</label>
            <input
              type="text"
              value={infraForm.connectionString}
              onChange={(e) => setInfraForm({ ...infraForm, connectionString: e.target.value })}
              placeholder="jdbc:mysql://localhost:3306/dbname"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowInfraModal(false)}>Cancel</Button>
            <Button onClick={handleSaveInfra} loading={saveLoading}>
              {editingInfra ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Firebase Modal ── */}
      <Modal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
        title="Firebase Configuration"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input
              type="text"
              value={firebaseForm.projectId}
              onChange={(e) => setFirebaseForm({ ...firebaseForm, projectId: e.target.value })}
              placeholder="my-firebase-project"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
            <input
              type="email"
              value={firebaseForm.clientEmail}
              onChange={(e) => setFirebaseForm({ ...firebaseForm, clientEmail: e.target.value })}
              placeholder="firebase-admin@project.iam.gserviceaccount.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Private Key</label>
            <textarea
              value={firebaseForm.privateKey}
              onChange={(e) => setFirebaseForm({ ...firebaseForm, privateKey: e.target.value })}
              placeholder={firebase ? 'Leave blank to keep current key' : 'Paste private key here'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Bucket</label>
            <input
              type="text"
              value={firebaseForm.storageBucket}
              onChange={(e) => setFirebaseForm({ ...firebaseForm, storageBucket: e.target.value })}
              placeholder="project.appspot.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowFirebaseModal(false)}>Cancel</Button>
            <Button onClick={handleSaveFirebase} loading={saveLoading}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ── Import Modal ── */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Configuration"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Paste JSON data with "services" and/or "infrastructure" arrays.
          </p>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder={'{\n  "services": [...],\n  "infrastructure": [...]\n}'}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancel</Button>
            <Button onClick={handleImport} loading={saveLoading}>Import</Button>
          </div>
        </div>
      </Modal>

      {/* ── Clone Modal ── */}
      <Modal
        isOpen={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        title={`Clone ${ENVIRONMENT_LABELS[env]}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Clone all service URLs and infrastructure from <strong>{ENVIRONMENT_LABELS[env]}</strong> to another environment.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Environment</label>
            <select
              value={cloneTarget}
              onChange={(e) => setCloneTarget(e.target.value as Environment)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ENVIRONMENTS.filter((e) => e !== env).map((e) => (
                <option key={e} value={e}>{ENVIRONMENT_LABELS[e]}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cloneOverwrite}
              onChange={(e) => setCloneOverwrite(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">Overwrite existing entries in target</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCloneModal(false)}>Cancel</Button>
            <Button onClick={handleClone} loading={saveLoading}>Clone</Button>
          </div>
        </div>
      </Modal>

      {/* ── Secret Modal ── */}
      <Modal
        isOpen={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        title={editingSecret ? 'Edit Secret' : 'Add Secret'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
            <input
              type="text"
              value={secretForm.secretKey}
              onChange={(e) => setSecretForm({ ...secretForm, secretKey: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
              disabled={!!editingSecret}
              placeholder="e.g. JWT_SECRET"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={secretForm.category}
              onChange={(e) => setSecretForm({ ...secretForm, category: e.target.value as SecretCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {(Object.entries(SECRET_CATEGORY_LABELS) as [SecretCategory, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <textarea
              value={secretForm.value}
              onChange={(e) => setSecretForm({ ...secretForm, value: e.target.value })}
              placeholder={editingSecret ? 'Leave blank to keep current value' : 'Enter secret value'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={secretForm.description}
              onChange={(e) => setSecretForm({ ...secretForm, description: e.target.value })}
              placeholder="What this secret is used for"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={secretForm.isRequired}
              onChange={(e) => setSecretForm({ ...secretForm, isRequired: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">Required for service to function</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowSecretModal(false)}>Cancel</Button>
            <Button onClick={handleSaveSecret} loading={saveLoading}>
              {editingSecret ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Template Setup Modal ── */}
      <Modal
        isOpen={showTemplateSetup}
        onClose={() => setShowTemplateSetup(false)}
        title="Quick Setup — Secrets & Configuration"
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <p className="text-sm text-gray-500">
            Fill in the values you have. Leave blank to skip. Existing secrets will be updated only if a new value is provided.
          </p>

          {(Object.entries(SECRET_CATEGORY_LABELS) as [SecretCategory, string][]).map(([cat, label]) => {
            const templates = SECRET_TEMPLATES.filter((t) => t.category === cat);
            if (templates.length === 0) return null;
            const existing = secrets.filter((s) => s.category === cat);

            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SECRET_CATEGORY_COLORS[cat]}`}>
                    {existing.length}/{templates.length} configured
                  </span>
                </div>
                <div className="space-y-2">
                  {templates.map((t) => {
                    const existingSecret = secrets.find((s) => s.secretKey === t.secretKey);
                    return (
                      <div key={t.secretKey} className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-4">
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono text-gray-800">{t.secretKey}</code>
                            {t.isRequired && <span className="text-red-500 text-xs">*</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                          {existingSecret && (
                            <p className="text-xs text-green-600 mt-0.5">Currently set</p>
                          )}
                        </div>
                        <div className="col-span-8">
                          {t.inputType === 'textarea' ? (
                            <textarea
                              value={templateValues[t.secretKey] || ''}
                              onChange={(e) => setTemplateValues({ ...templateValues, [t.secretKey]: e.target.value })}
                              placeholder={existingSecret ? 'Leave blank to keep current' : t.placeholder}
                              rows={2}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                            />
                          ) : (
                            <input
                              type={t.inputType}
                              value={templateValues[t.secretKey] || ''}
                              onChange={(e) => setTemplateValues({ ...templateValues, [t.secretKey]: e.target.value })}
                              placeholder={existingSecret ? 'Leave blank to keep current' : t.placeholder}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-1">
            <Button variant="secondary" onClick={() => setShowTemplateSetup(false)}>Cancel</Button>
            <Button onClick={handleSaveAllTemplates} loading={saveLoading}>
              Save All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
