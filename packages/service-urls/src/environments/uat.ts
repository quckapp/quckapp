import { EnvironmentVersionConfig, EnvironmentHosts } from '../types';

export const uat1VersionConfig: EnvironmentVersionConfig = {
  environment: 'uat1',
  defaultVersion: 'v1',
  // UAT1: Partner/Customer acceptance — mirrors production version.
};

export const uat1Hosts: EnvironmentHosts = {
  apiBaseUrl: 'https://uat1-api.quckapp.io',
  wsBaseUrl: 'wss://uat1-ws.quckapp.io',
  cdnBaseUrl: 'https://uat1-cdn.quckapp.io',
};

export const uat2VersionConfig: EnvironmentVersionConfig = {
  environment: 'uat2',
  defaultVersion: 'v1',
  // UAT2: Internal QA — may run newer version for validation.
  // categoryOverrides: {
  //   auth: 'v1.1',
  // },
};

export const uat2Hosts: EnvironmentHosts = {
  apiBaseUrl: 'https://uat2-api.quckapp.io',
  wsBaseUrl: 'wss://uat2-ws.quckapp.io',
  cdnBaseUrl: 'https://uat2-cdn.quckapp.io',
};

export const uat3VersionConfig: EnvironmentVersionConfig = {
  environment: 'uat3',
  defaultVersion: 'v1',
  // UAT3: Performance/Load testing — same version as production.
};

export const uat3Hosts: EnvironmentHosts = {
  apiBaseUrl: 'https://uat3-api.quckapp.io',
  wsBaseUrl: 'wss://uat3-ws.quckapp.io',
  cdnBaseUrl: 'https://uat3-cdn.quckapp.io',
};
