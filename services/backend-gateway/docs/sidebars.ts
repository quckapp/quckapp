import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quick-start',
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/integration-status',
        'getting-started/testing-guide',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/microservices',
        'architecture/gateway',
        'architecture/database',
        'architecture/websockets',
        'architecture/security',
        'architecture/algorithms-patterns',
        'architecture/auth-service',
        'architecture/realtime-service',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/index',
        'features/new-features',
        'features/implementation-summary',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/openapi',
        'api-reference/postman',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/environments',
        'deployment/docker',
        'deployment/railway',
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: [
        'integrations/firebase',
        'integrations/firebase-setup',
        'integrations/push-notifications',
        'integrations/monitoring',
        'integrations/message-brokers',
        'integrations/service-discovery',
      ],
    },
  ],
};

export default sidebars;
