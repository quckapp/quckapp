import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus,
  Trash2,
  Play,
  RefreshCw,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Button, Badge, Modal } from '../components/UI';
import {
  fetchProfiles,
  createProfile,
  applyProfile,
} from '../store/slices/versionSlice';
import { showSuccessToast, showErrorToast } from '../store/slices/toastSlice';
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  SERVICE_REGISTRY,
  type Environment,
} from '../types';
import type { RootState, AppDispatch } from '../store';

export default function Profiles() {
  const dispatch = useDispatch<AppDispatch>();
  const { profiles, loading, saveLoading } = useSelector((state: RootState) => state.versions);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [applyDropdownId, setApplyDropdownId] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ profileId: string; result: unknown } | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    entries: [{ serviceKey: '', apiVersion: '', releaseVersion: '' }],
  });

  useEffect(() => {
    dispatch(fetchProfiles());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchProfiles());
  };

  const addEntry = () => {
    setCreateForm({
      ...createForm,
      entries: [...createForm.entries, { serviceKey: '', apiVersion: '', releaseVersion: '' }],
    });
  };

  const removeEntry = (index: number) => {
    setCreateForm({
      ...createForm,
      entries: createForm.entries.filter((_, i) => i !== index),
    });
  };

  const updateEntry = (index: number, field: string, value: string) => {
    const entries = [...createForm.entries];
    entries[index] = { ...entries[index], [field]: value };
    setCreateForm({ ...createForm, entries });
  };

  const handleCreate = async () => {
    try {
      const validEntries = createForm.entries.filter(
        (e) => e.serviceKey && e.apiVersion && e.releaseVersion
      );
      if (validEntries.length === 0) {
        dispatch(showErrorToast('Add at least one valid entry'));
        return;
      }
      await dispatch(
        createProfile({
          name: createForm.name,
          description: createForm.description,
          entries: validEntries,
        })
      ).unwrap();
      dispatch(showSuccessToast('Profile created'));
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        entries: [{ serviceKey: '', apiVersion: '', releaseVersion: '' }],
      });
    } catch {
      dispatch(showErrorToast('Failed to create profile'));
    }
  };

  const handleApply = async (profileId: string, env: Environment) => {
    try {
      const result = await dispatch(applyProfile({ profileId, env })).unwrap();
      dispatch(showSuccessToast(`Profile applied to ${ENVIRONMENT_LABELS[env]}`));
      setApplyDropdownId(null);
      setApplyResult({ profileId, result });
    } catch {
      dispatch(showErrorToast('Failed to apply profile'));
      setApplyDropdownId(null);
    }
  };

  return (
    <div>
      <Header
        title="Version Profiles"
        onRefresh={handleRefresh}
        loading={loading}
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Profile
          </Button>
        }
      />

      <div className="p-6">
        {loading && profiles.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Profiles</h3>
            <p className="text-sm text-gray-500 mb-4">
              Version profiles let you define a set of service version mappings and apply them across environments.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create Profile
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{profile.name}</h3>
                    {profile.description && (
                      <p className="text-sm text-gray-500 mt-1">{profile.description}</p>
                    )}
                  </div>
                  <Badge variant="info" size="sm">
                    {profile.entries.length} {profile.entries.length === 1 ? 'entry' : 'entries'}
                  </Badge>
                </div>

                {/* Entries list */}
                <div className="space-y-1.5 mb-4">
                  {profile.entries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5"
                    >
                      <span className="text-gray-700 font-medium">{entry.serviceKey}</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-blue-600">{entry.apiVersion}</code>
                        <code className="text-xs text-gray-500">{entry.releaseVersion}</code>
                      </div>
                    </div>
                  ))}
                  {profile.entries.length > 5 && (
                    <p className="text-xs text-gray-400 px-3">
                      +{profile.entries.length - 5} more entries
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-400 mb-3">
                  Created by {profile.createdBy} on{' '}
                  {new Date(profile.createdAt).toLocaleDateString()}
                </div>

                {/* Apply result */}
                {applyResult && applyResult.profileId === profile.id && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <p className="font-medium text-green-800 mb-1">Applied successfully</p>
                    <pre className="text-xs text-green-700 whitespace-pre-wrap">
                      {JSON.stringify(applyResult.result, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 relative">
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setApplyDropdownId(applyDropdownId === profile.id ? null : profile.id)
                      }
                    >
                      <Play className="w-4 h-4 mr-1" /> Apply to Environment
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                    {applyDropdownId === profile.id && (
                      <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        {ENVIRONMENTS.map((envOption) => (
                          <button
                            key={envOption}
                            onClick={() => handleApply(profile.id, envOption)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {ENVIRONMENT_LABELS[envOption]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Profile Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Version Profile"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Name</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Q1 2026 Release"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Brief description of this version profile"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Entries</label>
              <Button size="sm" variant="ghost" onClick={addEntry}>
                <Plus className="w-4 h-4 mr-1" /> Add Entry
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {createForm.entries.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={entry.serviceKey}
                    onChange={(e) => updateEntry(index, 'serviceKey', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select service...</option>
                    {SERVICE_REGISTRY.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label} ({s.key})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={entry.apiVersion}
                    onChange={(e) => updateEntry(index, 'apiVersion', e.target.value)}
                    placeholder="API ver (e.g. v2)"
                    className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={entry.releaseVersion}
                    onChange={(e) => updateEntry(index, 'releaseVersion', e.target.value)}
                    placeholder="Release (e.g. 2.0.0)"
                    className="w-36 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {createForm.entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saveLoading}>
              Create Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
