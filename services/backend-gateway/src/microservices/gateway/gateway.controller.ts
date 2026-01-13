import { Controller, Get } from '@nestjs/common';

/**
 * Gateway Root Controller
 * Provides health and status endpoints for the API Gateway
 */
@Controller()
export class GatewayController {
  @Get()
  root() {
    return {
      service: 'QuckChat API Gateway',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('services')
  services() {
    return {
      services: [
        { name: 'auth', status: 'available' },
        { name: 'users', status: 'available' },
        { name: 'messages', status: 'available' },
        { name: 'conversations', status: 'available' },
        { name: 'notifications', status: 'available' },
        { name: 'media', status: 'available' },
        { name: 'calls', status: 'available' },
      ],
    };
  }
}
