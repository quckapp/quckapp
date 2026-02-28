import { Environment, EnvironmentVersionConfig, EnvironmentHosts } from '../types';
import { localVersionConfig, localHosts } from './local';
import { devVersionConfig, devHosts } from './dev';
import { qaVersionConfig, qaHosts } from './qa';
import {
  uat1VersionConfig, uat1Hosts,
  uat2VersionConfig, uat2Hosts,
  uat3VersionConfig, uat3Hosts,
} from './uat';
import { stagingVersionConfig, stagingHosts } from './staging';
import { productionVersionConfig, productionHosts } from './production';

export const VERSION_CONFIGS: Record<Environment, EnvironmentVersionConfig> = {
  local: localVersionConfig,
  dev: devVersionConfig,
  qa: qaVersionConfig,
  uat1: uat1VersionConfig,
  uat2: uat2VersionConfig,
  uat3: uat3VersionConfig,
  staging: stagingVersionConfig,
  production: productionVersionConfig,
};

export const HOST_CONFIGS: Record<Environment, EnvironmentHosts> = {
  local: localHosts,
  dev: devHosts,
  qa: qaHosts,
  uat1: uat1Hosts,
  uat2: uat2Hosts,
  uat3: uat3Hosts,
  staging: stagingHosts,
  production: productionHosts,
};

export {
  localVersionConfig, localHosts,
  devVersionConfig, devHosts,
  qaVersionConfig, qaHosts,
  uat1VersionConfig, uat1Hosts,
  uat2VersionConfig, uat2Hosts,
  uat3VersionConfig, uat3Hosts,
  stagingVersionConfig, stagingHosts,
  productionVersionConfig, productionHosts,
};
