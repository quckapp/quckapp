import { EnvironmentVersionConfig, EnvironmentHosts } from '../types';

export const devVersionConfig: EnvironmentVersionConfig = {
  environment: 'dev',
  defaultVersion: 'v1',
  // Dev environment can run ahead of production to validate new versions.
  // categoryOverrides: {
  //   auth: 'v1.1',
  //   messaging: 'v2',
  // },
};

export const devHosts: EnvironmentHosts = {
  apiBaseUrl: 'https://dev-api.quckapp.io',
  wsBaseUrl: 'wss://dev-ws.quckapp.io',
  cdnBaseUrl: 'https://dev-cdn.quckapp.io',
};
