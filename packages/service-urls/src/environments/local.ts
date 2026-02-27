import { EnvironmentVersionConfig, EnvironmentHosts } from '../types';

export const localVersionConfig: EnvironmentVersionConfig = {
  environment: 'local',
  defaultVersion: 'v1',
  // Local dev uses the baseline version for all services.
  // Override individual services here when testing a new version locally:
  // serviceOverrides: {
  //   'auth-service': 'v2',
  // },
};

export const localHosts: EnvironmentHosts = {
  apiBaseUrl: 'http://localhost:8000',
  wsBaseUrl: 'ws://localhost:8090',
  cdnBaseUrl: 'http://localhost:8000/cdn',
};
