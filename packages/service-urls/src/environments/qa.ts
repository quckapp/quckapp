import { EnvironmentVersionConfig, EnvironmentHosts } from '../types';

export const qaVersionConfig: EnvironmentVersionConfig = {
  environment: 'qa',
  defaultVersion: 'v1',
  // QA may test upcoming versions before they reach staging.
  // categoryOverrides: {
  //   auth: 'v1.1',
  // },
};

export const qaHosts: EnvironmentHosts = {
  apiBaseUrl: 'https://qa-api.quckapp.io',
  wsBaseUrl: 'wss://qa-ws.quckapp.io',
  cdnBaseUrl: 'https://qa-cdn.quckapp.io',
};
