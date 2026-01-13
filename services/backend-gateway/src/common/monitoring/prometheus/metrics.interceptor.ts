import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    // Skip metrics endpoint to avoid recursion
    if (request.url === '/metrics') {
      return next.handle();
    }

    const method = request.method;
    const route = this.getRoutePattern(request);
    const stopTimer = this.metricsService.startTimer();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = stopTimer();
          const statusCode = response.statusCode;
          this.metricsService.incrementHttpRequests(method, route, statusCode);
          this.metricsService.observeHttpRequestDuration(method, route, statusCode, duration);
        },
        error: (error) => {
          const duration = stopTimer();
          const statusCode = error.status || 500;
          this.metricsService.incrementHttpRequests(method, route, statusCode);
          this.metricsService.observeHttpRequestDuration(method, route, statusCode, duration);
        },
      }),
    );
  }

  private getRoutePattern(request: any): string {
    // Try to get the route pattern from the request
    if (request.route?.path) {
      return request.route.path;
    }

    // Fallback: normalize the URL by replacing IDs with placeholders
    let path = request.url.split('?')[0];

    // Replace MongoDB ObjectIds with :id placeholder
    path = path.replace(/[a-f0-9]{24}/gi, ':id');

    // Replace UUIDs with :id placeholder
    path = path.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, ':id');

    // Replace numeric IDs with :id placeholder
    path = path.replace(/\/\d+(?=\/|$)/g, '/:id');

    return path;
  }
}
