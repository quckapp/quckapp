import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Monitor,
  Code2,
  Cpu,
  Server,
  Boxes,
  Flame,
  Database,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Header } from '../components/Layout';
import { Badge } from '../components/UI';
import { fetchSummaries } from '../store/slices/serviceUrlsSlice';
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  ENVIRONMENT_COLORS,
  type Environment,
  type EnvironmentSummary,
} from '../types';
import type { RootState, AppDispatch } from '../store';

const envIcons: Record<string, React.ElementType> = {
  local: Monitor,
  development: Code2,
  qa: Cpu,
  uat1: Server,
  uat2: Server,
  uat3: Server,
  staging: Boxes,
  production: Flame,
};

export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { summaries, loading } = useSelector((state: RootState) => state.serviceUrls);

  useEffect(() => {
    dispatch(fetchSummaries());
  }, [dispatch]);

  const getSummary = (env: Environment): EnvironmentSummary | undefined =>
    summaries.find((s) => s.environment === env);

  return (
    <div>
      <Header
        title="Environment Overview"
        onRefresh={() => dispatch(fetchSummaries())}
        loading={loading}
      />

      <div className="p-6">
        {loading && summaries.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ENVIRONMENTS.map((env) => {
              const summary = getSummary(env);
              const Icon = envIcons[env] || Database;
              const colorClasses = ENVIRONMENT_COLORS[env];

              return (
                <button
                  key={env}
                  onClick={() => navigate(`/env/${env}`)}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-lg ${colorClasses}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">
                    {ENVIRONMENT_LABELS[env]}
                  </h3>

                  {summary ? (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{summary.serviceCount} services</span>
                        <span className="text-gray-300">|</span>
                        <span>{summary.infraCount} infra</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {summary.hasFirebase && (
                          <Badge variant="warning" size="sm">Firebase</Badge>
                        )}
                        {env === 'production' && (
                          <Badge variant="danger" size="sm">Prod</Badge>
                        )}
                      </div>
                      {summary.lastUpdated && (
                        <p className="text-xs text-gray-400">
                          Updated {new Date(summary.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-3">No data configured</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
