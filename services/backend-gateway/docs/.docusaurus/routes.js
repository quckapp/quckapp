import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'aef'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '6b4'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'd1b'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '0ee'),
                exact: true
              },
              {
                path: '/docs/api-reference/openapi',
                component: ComponentCreator('/docs/api-reference/openapi', 'acd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api-reference/postman',
                component: ComponentCreator('/docs/api-reference/postman', 'c06'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/algorithms-patterns',
                component: ComponentCreator('/docs/architecture/algorithms-patterns', 'e04'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/auth-service',
                component: ComponentCreator('/docs/architecture/auth-service', '0c9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/database',
                component: ComponentCreator('/docs/architecture/database', '7e7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/gateway',
                component: ComponentCreator('/docs/architecture/gateway', 'b3a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/microservices',
                component: ComponentCreator('/docs/architecture/microservices', '507'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/overview',
                component: ComponentCreator('/docs/architecture/overview', '8f4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/realtime-service',
                component: ComponentCreator('/docs/architecture/realtime-service', 'a98'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/security',
                component: ComponentCreator('/docs/architecture/security', 'b28'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/websockets',
                component: ComponentCreator('/docs/architecture/websockets', 'c9c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/docker',
                component: ComponentCreator('/docs/deployment/docker', '460'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/environments',
                component: ComponentCreator('/docs/deployment/environments', '2fa'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment/railway',
                component: ComponentCreator('/docs/deployment/railway', '9e1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/features/',
                component: ComponentCreator('/docs/features/', '433'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/features/implementation-summary',
                component: ComponentCreator('/docs/features/implementation-summary', '508'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/features/new-features',
                component: ComponentCreator('/docs/features/new-features', '62b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/configuration',
                component: ComponentCreator('/docs/getting-started/configuration', '4f7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/installation',
                component: ComponentCreator('/docs/getting-started/installation', 'f1f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/integration-status',
                component: ComponentCreator('/docs/getting-started/integration-status', 'e5a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/quick-start',
                component: ComponentCreator('/docs/getting-started/quick-start', '835'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/testing-guide',
                component: ComponentCreator('/docs/getting-started/testing-guide', '142'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/firebase',
                component: ComponentCreator('/docs/integrations/firebase', '27b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/firebase-setup',
                component: ComponentCreator('/docs/integrations/firebase-setup', 'b24'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/message-brokers',
                component: ComponentCreator('/docs/integrations/message-brokers', 'e2e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/monitoring',
                component: ComponentCreator('/docs/integrations/monitoring', '3c3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/push-notifications',
                component: ComponentCreator('/docs/integrations/push-notifications', 'd45'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/integrations/service-discovery',
                component: ComponentCreator('/docs/integrations/service-discovery', 'd9f'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
