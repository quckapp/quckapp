import { EnvironmentVersionConfig, EnvironmentHosts } from '../types';

export const stagingVersionConfig: EnvironmentVersionConfig = {
  environment: 'staging',
  defaultVersion: 'v1',
  // Staging should mirror production. Only override when validating
  // a version bump BEFORE it goes live.
  // categoryOverrides: {
  //   auth: 'v1.1',
  // },
};

export const stagingHosts: EnvironmentHosts = {
  apiBaseUrl: 'https://staging-api.quckapp.io',
  wsBaseUrl: 'wss://staging-ws.quckapp.io',
  cdnBaseUrl: 'https://staging-cdn.quckapp.io',
};
