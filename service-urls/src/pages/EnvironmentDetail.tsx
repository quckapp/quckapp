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
} from '../types';
import type { RootState, AppDispatch } from '../store';

type ActiveSection = 'overview' | ServiceCategory | 'infrastructure' | 'firebase';

const SECTIONS: { key: ActiveSection; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'SPRING', label: 'Spring Boot' },
  { key: 'NESTJS', label: 'NestJS' },
  { key: 'ELIXIR', label: 'Elixir' },
  { key: 'GO', label: 'Go' },
  { key: 'PYTHON', label: 'Python' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'firebase', label: 'Firebase' },
];

export default function EnvironmentDetail() {
  const { envName } = useParams<{ envName: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { services, infrastructure, firebase, loading, saveLoading } = useSelector(
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
  const [cloneTarget, setCloneTarget] = useState<Environment>('qa');
  const [cloneOverwrite, setCloneOverwrite] = useState(false);

  const env = envName as Environment;

  if (!ENVIRONMENTS.includes(env)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    dispatch(clearEnvironmentData());
    dispatch(fetchServices({ env }));
    dispatch(fetchInfrastructure(env));
    dispatch(fetchFirebase(env));
  }, [dispatch, env]);

  const handleRefresh = () => {
    dispatch(fetchServices({ env }));
    dispatch(fetchInfrastructure(env));
    dispatch(fetchFirebase(env));
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

  // ── Filtering ──

  const filteredServices = useMemo(() => {
    let filtered = services;
    if (activeSection !== 'overview' && activeSection !== 'infrastructure' && activeSection !== 'firebase') {
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
          <p className="text-sm text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-gray-900">{Object.keys(categoryCounts).length}</p>
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
          {activeSection !== 'overview' && activeSection !== 'infrastructure' && activeSection !== 'firebase'
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

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'infrastructure':
        return renderInfrastructure();
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
                    {key === 'firebase' && <FlameIcon className="w-4 h-4" />}
                    {key !== 'overview' && key !== 'infrastructure' && key !== 'firebase' && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          CATEGORY_COLORS[key as ServiceCategory]?.split(' ')[0] || 'bg-gray-300'
                        }`}
                      />
                    )}
                    <span>{label}</span>
                  </div>
                  {key !== 'overview' && key !== 'infrastructure' && key !== 'firebase' && (
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
    </div>
  );
}
