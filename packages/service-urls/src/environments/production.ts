import { EnvironmentVersionConfig, EnvironmentHosts } from '../types';

export const productionVersionConfig: EnvironmentVersionConfig = {
  environment: 'production',
  defaultVersion: 'v1',
  // Production uses the stable baseline.
  // Only bump versions here after full validation through staging.
};

export const productionHosts: EnvironmentHosts = {
  apiBaseUrl: 'https://api.quckapp.io',
  wsBaseUrl: 'wss://ws.quckapp.io',
  cdnBaseUrl: 'https://cdn.quckapp.io',
};
