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
  GitBranch,
  Play,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileDown,
  Settings,
  Shield,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Button, Badge, Modal } from '../components/UI';
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
  fetchConfigEntries,
  createConfigEntry,
  updateConfigEntry,
  deleteConfigEntry,
} from '../store/slices/serviceUrlsSlice';
import {
  fetchVersions,
  markReady,
  activateVersion,
  deprecateVersion,
  disableVersion,
  deleteVersion,
  bulkPlan,
  bulkActivate,
  fetchGlobalConfig,
  updateGlobalConfig,
  exportEnvFile,
  fetchProfiles,
  createProfile,
  applyProfile,
  clearVersionData,
} from '../store/slices/versionSlice';
import { showSuccessToast, showErrorToast } from '../store/slices/toastSlice';
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  SERVICE_REGISTRY,
  SERVICE_STACK_MAP,
  TECH_STACK_LABELS,
  TECH_STACK_COLORS,
  VERSION_STATUS_COLORS,
  VERSION_STATUS_LABELS,
  CONFIG_CATEGORIES,
  CONFIG_CATEGORY_LABELS,
  CONFIG_CATEGORY_COLORS,
  CONFIG_CATEGORY_GROUPS,
  SERVICE_FUNC_CATEGORIES,
  SERVICE_FUNC_LABELS,
  SERVICE_FUNC_COLORS,
  SERVICE_FUNC_GROUPS,
  type Environment,
  type NpmServiceCategory,
  type ConfigCategory,
  type ServiceUrlConfig,
  type InfrastructureConfig,
  type ConfigEntry,
} from '../types';
import type { RootState, AppDispatch } from '../store';

type ActiveSection = 'overview' | NpmServiceCategory | 'infrastructure' | 'firebase' | 'config-entries' | ConfigCategory | 'versions';

const CONFIG_SIDEBAR_GROUPS = CONFIG_CATEGORY_GROUPS;

export default function EnvironmentDetail() {
  const { envName } = useParams<{ envName: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { services, infrastructure, firebase, configEntries, loading, saveLoading } = useSelector(
    (state: RootState) => state.serviceUrls
  );
  const {
    versions,
    globalConfig,
    profiles,
    loading: _versionLoading,
    saveLoading: versionSaveLoading,
  } = useSelector((state: RootState) => state.versions);

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInfraModal, setShowInfraModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showBulkPlanModal, setShowBulkPlanModal] = useState(false);
  const [showGlobalConfigModal, setShowGlobalConfigModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceUrlConfig | null>(null);
  const [editingInfra, setEditingInfra] = useState<InfrastructureConfig | null>(null);
  const [showConfigEntryModal, setShowConfigEntryModal] = useState(false);
  const [editingConfigEntry, setEditingConfigEntry] = useState<ConfigEntry | null>(null);
  // configCategoryFilter is now driven by activeSection in the sidebar

  // Form states
  const [serviceForm, setServiceForm] = useState({
    serviceKey: '',
    category: 'auth' as NpmServiceCategory,
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
  const [cloneTarget, setCloneTarget] = useState<Environment>('qa');
  const [cloneOverwrite, setCloneOverwrite] = useState(false);
  const [configEntryForm, setConfigEntryForm] = useState({
    configKey: '',
    category: 'INFRA' as ConfigCategory,
    configValue: '',
    isSecret: false,
    description: '',
  });

  // Version form states
  const [bulkPlanForm, setBulkPlanForm] = useState({
    apiVersion: '',
    serviceKeys: '' as string,
    changelog: '',
  });
  const [globalConfigForm, setGlobalConfigForm] = useState({
    defaultApiVersion: '',
    defaultSunsetDays: 90,
  });

  // Profile states
  const [showProfilesPanel, setShowProfilesPanel] = useState(false);
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    entries: [{ serviceKey: '', apiVersion: '', releaseVersion: '' }] as { serviceKey: string; apiVersion: string; releaseVersion: string }[],
  });

  const env = envName as Environment;

  if (!ENVIRONMENTS.includes(env)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    dispatch(clearEnvironmentData());
    dispatch(clearVersionData());
    dispatch(fetchServices({ env }));
    dispatch(fetchInfrastructure(env));
    dispatch(fetchFirebase(env));
    dispatch(fetchConfigEntries({ env }));
    dispatch(fetchVersions(env));
    dispatch(fetchGlobalConfig(env));
    dispatch(fetchProfiles());
  }, [dispatch, env]);

  const handleRefresh = () => {
    dispatch(fetchServices({ env }));
    dispatch(fetchInfrastructure(env));
    dispatch(fetchFirebase(env));
    dispatch(fetchConfigEntries({ env }));
    dispatch(fetchVersions(env));
    dispatch(fetchGlobalConfig(env));
  };

  // ── Available services (exclude already-added) ──

  const availableServices = useMemo(() => {
    const existingKeys = new Set(services.map((s) => s.serviceKey));
    return SERVICE_REGISTRY.filter((s) => !existingKeys.has(s.key));
  }, [services]);

  // ── Service CRUD ──

  const openAddService = (category?: NpmServiceCategory) => {
    setEditingService(null);
    setServiceForm({
      serviceKey: '',
      category: category || 'auth',
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

  // ── Config Entries CRUD ──

  const openAddConfigEntry = () => {
    setEditingConfigEntry(null);
    setConfigEntryForm({ configKey: '', category: activeConfigCategory || 'INFRA', configValue: '', isSecret: false, description: '' });
    setShowConfigEntryModal(true);
  };

  const openEditConfigEntry = (entry: ConfigEntry) => {
    setEditingConfigEntry(entry);
    setConfigEntryForm({
      configKey: entry.configKey,
      category: entry.category,
      configValue: '',
      isSecret: entry.isSecret,
      description: entry.description,
    });
    setShowConfigEntryModal(true);
  };

  const handleSaveConfigEntry = async () => {
    try {
      if (editingConfigEntry) {
        await dispatch(updateConfigEntry({ env, configKey: editingConfigEntry.configKey, data: configEntryForm })).unwrap();
        dispatch(showSuccessToast('Config entry updated'));
      } else {
        await dispatch(createConfigEntry({ env, data: configEntryForm })).unwrap();
        dispatch(showSuccessToast('Config entry created'));
      }
      setShowConfigEntryModal(false);
      dispatch(fetchConfigEntries({ env }));
    } catch {
      dispatch(showErrorToast('Failed to save config entry'));
    }
  };

  const handleDeleteConfigEntry = async (configKey: string) => {
    if (!confirm(`Delete config entry "${configKey}"?`)) return;
    try {
      await dispatch(deleteConfigEntry({ env, configKey })).unwrap();
      dispatch(showSuccessToast('Config entry deleted'));
    } catch {
      dispatch(showErrorToast('Failed to delete config entry'));
    }
  };

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

  // ── Version Actions ──

  const handleMarkReady = async (serviceKey: string, ver: string) => {
    try {
      await dispatch(markReady({ env, serviceKey, ver })).unwrap();
      dispatch(showSuccessToast(`Version ${ver} marked ready for ${serviceKey}`));
    } catch {
      dispatch(showErrorToast('Failed to mark version ready'));
    }
  };

  const handleActivateVersion = async (serviceKey: string, ver: string) => {
    try {
      await dispatch(activateVersion({ env, serviceKey, ver })).unwrap();
      dispatch(showSuccessToast(`Version ${ver} activated for ${serviceKey}`));
    } catch {
      dispatch(showErrorToast('Failed to activate version'));
    }
  };

  const handleDeprecateVersion = async (serviceKey: string, ver: string) => {
    try {
      await dispatch(deprecateVersion({ env, serviceKey, ver })).unwrap();
      dispatch(showSuccessToast(`Version ${ver} deprecated for ${serviceKey}`));
    } catch {
      dispatch(showErrorToast('Failed to deprecate version'));
    }
  };

  const handleDisableVersion = async (serviceKey: string, ver: string) => {
    try {
      await dispatch(disableVersion({ env, serviceKey, ver })).unwrap();
      dispatch(showSuccessToast(`Version ${ver} disabled for ${serviceKey}`));
    } catch {
      dispatch(showErrorToast('Failed to disable version'));
    }
  };

  const handleDeleteVersion = async (serviceKey: string, ver: string) => {
    if (!confirm(`Delete version "${ver}" for "${serviceKey}"?`)) return;
    try {
      await dispatch(deleteVersion({ env, serviceKey, ver })).unwrap();
      dispatch(showSuccessToast('Version deleted'));
    } catch {
      dispatch(showErrorToast('Failed to delete version'));
    }
  };

  const handleBulkPlan = async () => {
    try {
      const serviceKeys = bulkPlanForm.serviceKeys
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await dispatch(
        bulkPlan({ env, apiVersion: bulkPlanForm.apiVersion, serviceKeys, changelog: bulkPlanForm.changelog })
      ).unwrap();
      dispatch(showSuccessToast('Bulk plan created'));
      setShowBulkPlanModal(false);
      setBulkPlanForm({ apiVersion: '', serviceKeys: '', changelog: '' });
      dispatch(fetchVersions(env));
    } catch {
      dispatch(showErrorToast('Failed to create bulk plan'));
    }
  };

  const handleBulkActivate = async () => {
    const readyVersions = versions.filter((v) => v.status === 'READY');
    if (readyVersions.length === 0) {
      dispatch(showErrorToast('No READY versions to activate'));
      return;
    }
    const apiVersions = [...new Set(readyVersions.map((v) => v.apiVersion))];
    try {
      for (const apiVersion of apiVersions) {
        await dispatch(bulkActivate({ env, apiVersion })).unwrap();
      }
      dispatch(showSuccessToast('All ready versions activated'));
      dispatch(fetchVersions(env));
    } catch {
      dispatch(showErrorToast('Failed to bulk activate versions'));
    }
  };

  const openGlobalConfigModal = () => {
    setGlobalConfigForm({
      defaultApiVersion: globalConfig?.defaultApiVersion || '',
      defaultSunsetDays: globalConfig?.defaultSunsetDays || 90,
    });
    setShowGlobalConfigModal(true);
  };

  const handleSaveGlobalConfig = async () => {
    try {
      await dispatch(updateGlobalConfig({ env, data: globalConfigForm })).unwrap();
      dispatch(showSuccessToast('Global config updated'));
      setShowGlobalConfigModal(false);
    } catch {
      dispatch(showErrorToast('Failed to update global config'));
    }
  };

  const handleExportEnvFile = () => {
    dispatch(exportEnvFile(env));
  };

  // ── Profiles ──

  const handleCreateProfile = async () => {
    const validEntries = profileForm.entries.filter((e) => e.serviceKey && e.apiVersion && e.releaseVersion);
    if (!profileForm.name || validEntries.length === 0) {
      dispatch(showErrorToast('Profile needs a name and at least one complete entry'));
      return;
    }
    try {
      await dispatch(createProfile({ name: profileForm.name, description: profileForm.description, entries: validEntries })).unwrap();
      dispatch(showSuccessToast('Profile created'));
      setShowCreateProfileModal(false);
      setProfileForm({ name: '', description: '', entries: [{ serviceKey: '', apiVersion: '', releaseVersion: '' }] });
    } catch {
      dispatch(showErrorToast('Failed to create profile'));
    }
  };

  const handleApplyProfile = async (profileId: string) => {
    try {
      await dispatch(applyProfile({ profileId, env })).unwrap();
      dispatch(showSuccessToast('Profile applied — versions created as PLANNED'));
      dispatch(fetchVersions(env));
      setShowProfilesPanel(false);
    } catch {
      dispatch(showErrorToast('Failed to apply profile'));
    }
  };

  const addProfileEntry = () => {
    setProfileForm((prev) => ({
      ...prev,
      entries: [...prev.entries, { serviceKey: '', apiVersion: '', releaseVersion: '' }],
    }));
  };

  const removeProfileEntry = (idx: number) => {
    setProfileForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== idx),
    }));
  };

  const updateProfileEntry = (idx: number, field: string, value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      entries: prev.entries.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }));
  };

  // ── Filtering ──

  const activeServiceCategory = SERVICE_FUNC_CATEGORIES.includes(activeSection as NpmServiceCategory)
    ? (activeSection as NpmServiceCategory)
    : null;

  const filteredServices = useMemo(() => {
    let filtered = services;
    if (activeServiceCategory) {
      filtered = filtered.filter((s) => s.category === activeServiceCategory);
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
  }, [services, activeServiceCategory, searchQuery]);

  const serviceCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of services) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [services]);

  const configCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of configEntries) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return counts;
  }, [configEntries]);

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
          <p className="text-sm text-gray-500">Config Entries</p>
          <p className="text-2xl font-bold text-gray-900">{configEntries.length}</p>
        </div>
      </div>

      {SERVICE_FUNC_CATEGORIES.map((cat) => {
        const catServices = services.filter((s) => s.category === cat);
        if (catServices.length === 0) return null;
        return (
          <div key={cat} className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" size="sm">
                  <span className={SERVICE_FUNC_COLORS[cat]?.split(' ')[1]}>{SERVICE_FUNC_LABELS[cat]}</span>
                </Badge>
                <span className="text-sm text-gray-400">{catServices.length} services</span>
              </div>
              <button
                onClick={() => setActiveSection(cat)}
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
          {activeServiceCategory
            ? SERVICE_FUNC_LABELS[activeServiceCategory]
            : 'All'}{' '}
          Services ({filteredServices.length})
        </h3>
        <Button size="sm" onClick={() => openAddService(activeServiceCategory || undefined)}>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stack</th>
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
                    {SERVICE_STACK_MAP[svc.serviceKey] ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TECH_STACK_COLORS[SERVICE_STACK_MAP[svc.serviceKey]]}`}>
                        {TECH_STACK_LABELS[SERVICE_STACK_MAP[svc.serviceKey]]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SERVICE_FUNC_COLORS[svc.category] || 'bg-gray-100 text-gray-700'}`}>
                      {SERVICE_FUNC_LABELS[svc.category] || svc.category}
                    </span>
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

  const activeConfigCategory = CONFIG_CATEGORIES.includes(activeSection as ConfigCategory) ? (activeSection as ConfigCategory) : null;

  const filteredConfigEntries = useMemo(() => {
    if (!activeConfigCategory) return configEntries;
    return configEntries.filter((e) => e.category === activeConfigCategory);
  }, [configEntries, activeConfigCategory]);

  const renderConfigEntries = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          {activeConfigCategory ? CONFIG_CATEGORY_LABELS[activeConfigCategory] : 'All Configuration'} ({filteredConfigEntries.length})
        </h3>
        <Button size="sm" onClick={openAddConfigEntry}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {filteredConfigEntries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          No config entries found. Click "Add" to create one.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Secret</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredConfigEntries.map((entry) => (
                  <tr key={entry.configKey} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{entry.configKey}</span>
                        {entry.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{entry.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded max-w-xs truncate block">
                        {entry.configValue}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${CONFIG_CATEGORY_COLORS[entry.category]}`}>
                        {CONFIG_CATEGORY_LABELS[entry.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.isSecret ? (
                        <Shield className="w-4 h-4 text-red-500" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditConfigEntry(entry)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfigEntry(entry.configKey)}
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
        </div>
      )}
    </div>
  );

  const renderVersions = () => (
    <div className="space-y-6">
      {/* Bulk actions bar */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">API Versions ({versions.length})</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportEnvFile}>
            <FileDown className="w-4 h-4 mr-1" /> Export .env
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowBulkPlanModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Plan Version
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowProfilesPanel(!showProfilesPanel)}>
            <Layers className="w-4 h-4 mr-1" /> Profiles
          </Button>
          <Button size="sm" variant="success" onClick={handleBulkActivate}>
            <Play className="w-4 h-4 mr-1" /> Activate All Ready
          </Button>
        </div>
      </div>

      {/* Profiles Panel */}
      {showProfilesPanel && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-gray-900">Version Profiles</span>
            </div>
            <Button size="sm" variant="primary" onClick={() => setShowCreateProfileModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create Profile
            </Button>
          </div>
          {profiles.length === 0 ? (
            <p className="text-sm text-gray-400">No profiles yet. Create one to save a reusable version template.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div key={profile.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{profile.name}</span>
                      {profile.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{profile.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleApplyProfile(profile.id)}
                      loading={versionSaveLoading}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> Apply to {env}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.entries.map((entry) => (
                      <span key={entry.id} className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-50 text-gray-600 rounded">
                        {entry.serviceKey} <code className="ml-1 text-purple-600">{entry.apiVersion}</code>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Config Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-900">Global Version Config</span>
          </div>
          <Button size="sm" variant="ghost" onClick={openGlobalConfigModal}>
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
        </div>
        {globalConfig ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Default API Version</span>
              <p className="font-mono text-gray-900">{globalConfig.defaultApiVersion}</p>
            </div>
            <div>
              <span className="text-gray-500">Default Sunset Days</span>
              <p className="font-mono text-gray-900">{globalConfig.defaultSunsetDays}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No global config set. Click "Edit" to configure.</p>
        )}
      </div>

      {/* Versions Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {versions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No versions configured. Click "Plan Version" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Release Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sunset Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {versions.map((ver) => (
                  <tr key={`${ver.serviceKey}-${ver.apiVersion}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{ver.serviceKey}</span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{ver.apiVersion}</code>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{ver.releaseVersion}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          VERSION_STATUS_COLORS[ver.status]
                        }`}
                      >
                        {VERSION_STATUS_LABELS[ver.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {ver.sunsetDate
                        ? new Date(ver.sunsetDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {ver.status === 'PLANNED' && (
                          <button
                            onClick={() => handleMarkReady(ver.serviceKey, ver.apiVersion)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            title="Mark Ready"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Ready
                          </button>
                        )}
                        {ver.status === 'READY' && (
                          <button
                            onClick={() => handleActivateVersion(ver.serviceKey, ver.apiVersion)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                            title="Activate"
                          >
                            <Play className="w-3.5 h-3.5" /> Activate
                          </button>
                        )}
                        {ver.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDeprecateVersion(ver.serviceKey, ver.apiVersion)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded transition-colors"
                            title="Deprecate"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Deprecate
                          </button>
                        )}
                        {(ver.status === 'DEPRECATED' || ver.status === 'SUNSET') && (
                          <button
                            onClick={() => handleDisableVersion(ver.serviceKey, ver.apiVersion)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                            title="Disable"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Disable
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteVersion(ver.serviceKey, ver.apiVersion)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
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
    </div>
  );

  const renderContent = () => {
    if (activeServiceCategory) {
      return renderServicesTable();
    }
    if (activeConfigCategory || activeSection === 'config-entries') {
      return renderConfigEntries();
    }
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'infrastructure':
        return renderInfrastructure();
      case 'firebase':
        return renderFirebase();
      case 'versions':
        return renderVersions();
      default:
        return renderOverview();
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
            {/* Overview */}
            <li>
              <button onClick={() => setActiveSection('overview')} className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${activeSection === 'overview' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /><span>Overview</span></div>
              </button>
            </li>

            {/* Services — grouped by functional category */}
            {SERVICE_FUNC_GROUPS.map((group) => (
              <li key={group.label}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.categories.map((cat) => (
                    <li key={cat}>
                      <button onClick={() => setActiveSection(cat)} className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors ${activeSection === cat ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${SERVICE_FUNC_COLORS[cat]?.split(' ')[0] || 'bg-gray-300'}`} />
                          <span>{SERVICE_FUNC_LABELS[cat]}</span>
                        </div>
                        <span className="text-xs text-gray-400">{serviceCategoryCounts[cat] || 0}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            {/* Configuration — grouped categories */}
            {CONFIG_SIDEBAR_GROUPS.map((group) => (
              <li key={group.label}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.categories.map((cat) => (
                    <li key={cat}>
                      <button onClick={() => setActiveSection(cat)} className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors ${activeSection === cat ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${CONFIG_CATEGORY_COLORS[cat]?.split(' ')[0] || 'bg-gray-300'}`} />
                          <span>{CONFIG_CATEGORY_LABELS[cat]}</span>
                        </div>
                        <span className="text-xs text-gray-400">{configCategoryCounts[cat] || 0}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            {/* Versions */}
            <li>
              <button onClick={() => setActiveSection('versions')} className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${activeSection === 'versions' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <div className="flex items-center gap-2"><GitBranch className="w-4 h-4" /><span>Versions</span></div>
                <span className="text-xs text-gray-400">{versions.length}</span>
              </button>
            </li>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            {editingService ? (
              <input
                type="text"
                value={serviceForm.serviceKey}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
            ) : availableServices.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">All services have been added.</p>
            ) : (
              <select
                value={serviceForm.serviceKey}
                onChange={(e) => {
                  const selected = SERVICE_REGISTRY.find((s) => s.key === e.target.value);
                  setServiceForm({
                    ...serviceForm,
                    serviceKey: e.target.value,
                    description: selected?.label || '',
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {availableServices.map((s) => (
                  <option key={s.key} value={s.key}>{s.label} ({s.key})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={serviceForm.category}
              onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as NpmServiceCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SERVICE_FUNC_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{SERVICE_FUNC_LABELS[cat]}</option>
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

      {/* ── Config Entry Modal ── */}
      <Modal
        isOpen={showConfigEntryModal}
        onClose={() => {
          setShowConfigEntryModal(false);
          setEditingConfigEntry(null);
        }}
        title={editingConfigEntry ? 'Edit Config Entry' : 'Add Config Entry'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Config Key</label>
            <input
              type="text"
              value={configEntryForm.configKey}
              onChange={(e) => setConfigEntryForm({ ...configEntryForm, configKey: e.target.value })}
              disabled={!!editingConfigEntry}
              placeholder="DB_PASSWORD"
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${editingConfigEntry ? 'bg-gray-100 text-gray-500' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={configEntryForm.category}
              onChange={(e) => setConfigEntryForm({ ...configEntryForm, category: e.target.value as ConfigCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CONFIG_CATEGORY_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.categories.map((cat) => (
                    <option key={cat} value={cat}>{CONFIG_CATEGORY_LABELS[cat]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type={configEntryForm.isSecret ? 'password' : 'text'}
              value={configEntryForm.configValue}
              onChange={(e) => setConfigEntryForm({ ...configEntryForm, configValue: e.target.value })}
              placeholder={editingConfigEntry?.isSecret ? 'Leave blank to keep current value' : 'Enter value'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfigEntryForm({ ...configEntryForm, isSecret: !configEntryForm.isSecret })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${configEntryForm.isSecret ? 'bg-red-500' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${configEntryForm.isSecret ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
            <span className="text-sm text-gray-700 flex items-center gap-1">
              {configEntryForm.isSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Secret value
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={configEntryForm.description}
              onChange={(e) => setConfigEntryForm({ ...configEntryForm, description: e.target.value })}
              placeholder="Brief description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowConfigEntryModal(false); setEditingConfigEntry(null); }}>Cancel</Button>
            <Button onClick={handleSaveConfigEntry} loading={saveLoading}>
              {editingConfigEntry ? 'Update' : 'Create'}
            </Button>
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

      {/* ── Bulk Plan Modal ── */}
      <Modal
        isOpen={showBulkPlanModal}
        onClose={() => setShowBulkPlanModal(false)}
        title="Plan New Version"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Create PLANNED version entries for the specified services.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Version</label>
            <input
              type="text"
              value={bulkPlanForm.apiVersion}
              onChange={(e) => setBulkPlanForm({ ...bulkPlanForm, apiVersion: e.target.value })}
              placeholder="e.g. v2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Keys (comma-separated)</label>
            <textarea
              value={bulkPlanForm.serviceKeys}
              onChange={(e) => setBulkPlanForm({ ...bulkPlanForm, serviceKeys: e.target.value })}
              placeholder="auth-service, user-service, channel-service"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Available: {SERVICE_REGISTRY.map((s) => s.key).join(', ')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Changelog</label>
            <textarea
              value={bulkPlanForm.changelog}
              onChange={(e) => setBulkPlanForm({ ...bulkPlanForm, changelog: e.target.value })}
              placeholder="Describe the changes in this version..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowBulkPlanModal(false)}>Cancel</Button>
            <Button onClick={handleBulkPlan} loading={versionSaveLoading}>Create Plan</Button>
          </div>
        </div>
      </Modal>

      {/* ── Global Config Modal ── */}
      <Modal
        isOpen={showGlobalConfigModal}
        onClose={() => setShowGlobalConfigModal(false)}
        title="Edit Global Version Config"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default API Version</label>
            <input
              type="text"
              value={globalConfigForm.defaultApiVersion}
              onChange={(e) => setGlobalConfigForm({ ...globalConfigForm, defaultApiVersion: e.target.value })}
              placeholder="e.g. v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Sunset Days</label>
            <input
              type="number"
              value={globalConfigForm.defaultSunsetDays}
              onChange={(e) => setGlobalConfigForm({ ...globalConfigForm, defaultSunsetDays: parseInt(e.target.value) || 0 })}
              placeholder="90"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowGlobalConfigModal(false)}>Cancel</Button>
            <Button onClick={handleSaveGlobalConfig} loading={versionSaveLoading}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ── Create Profile Modal ── */}
      <Modal
        isOpen={showCreateProfileModal}
        onClose={() => setShowCreateProfileModal(false)}
        title="Create Version Profile"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              placeholder="e.g. v1-baseline"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={profileForm.description}
              onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Entries</label>
              <button onClick={addProfileEntry} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                + Add Entry
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {profileForm.entries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={entry.serviceKey}
                    onChange={(e) => updateProfileEntry(idx, 'serviceKey', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Service...</option>
                    {SERVICE_REGISTRY.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={entry.apiVersion}
                    onChange={(e) => updateProfileEntry(idx, 'apiVersion', e.target.value)}
                    placeholder="API ver"
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={entry.releaseVersion}
                    onChange={(e) => updateProfileEntry(idx, 'releaseVersion', e.target.value)}
                    placeholder="Release"
                    className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {profileForm.entries.length > 1 && (
                    <button
                      onClick={() => removeProfileEntry(idx)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateProfileModal(false)}>Cancel</Button>
            <Button onClick={handleCreateProfile} loading={versionSaveLoading}>Create Profile</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
