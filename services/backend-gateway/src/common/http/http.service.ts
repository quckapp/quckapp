import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { LoggerService } from '../logger/logger.service';

export interface HttpRequestConfig extends AxiosRequestConfig {
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  duration: number;
}

export interface HttpError {
  message: string;
  status?: number;
  statusText?: string;
  data?: any;
  code?: string;
}

@Injectable()
export class HttpService implements OnModuleDestroy {
  private client: AxiosInstance;
  private requestCache: Map<string, { data: any; expiresAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.client = this.createAxiosInstance();
    this.setupInterceptors();

    // Cleanup cache every minute
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 60000);
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      timeout: parseInt(this.configService.get('HTTP_TIMEOUT') || '30000', 10),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `QuckChat-Backend/${this.configService.get('APP_VERSION') || '1.0.0'}`,
      },
      validateStatus: (status) => status < 500, // Resolve for all status < 500
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add request ID
        (config as any).metadata = {
          startTime: Date.now(),
          requestId: this.generateRequestId(),
        };

        this.logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`, {
          context: 'HttpService',
          requestId: (config as any).metadata.requestId,
        });

        return config;
      },
      (error) => {
        this.logger.error('HTTP Request Error', { context: 'HttpService', error: error.message });
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || Date.now());
        const requestId = (response.config as any).metadata?.requestId;

        this.logger.logExternalCall(
          this.getServiceName(response.config.url || ''),
          response.config.url || '',
          duration,
          true,
          { status: response.status, requestId },
        );

        return response;
      },
      (error: AxiosError) => {
        const duration = Date.now() - ((error.config as any)?.metadata?.startTime || Date.now());
        const requestId = (error.config as any)?.metadata?.requestId;

        this.logger.logExternalCall(
          this.getServiceName(error.config?.url || ''),
          error.config?.url || '',
          duration,
          false,
          {
            status: error.response?.status,
            requestId,
            error: error.message,
          },
        );

        return Promise.reject(error);
      },
    );
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    // Check cache
    if (config?.cache) {
      const cached = this.getFromCache(url);
      if (cached) {
        return cached;
      }
    }

    const response = await this.request<T>({ ...config, method: 'GET', url });

    // Store in cache if enabled
    if (config?.cache) {
      this.storeInCache(url, response, config.cacheTTL);
    }

    return response;
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Make a HEAD request
   */
  async head(url: string, config?: HttpRequestConfig): Promise<HttpResponse<void>> {
    return this.request<void>({ ...config, method: 'HEAD', url });
  }

  /**
   * Execute request with retry logic
   */
  private async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const retries = config.retries || 0;
    const retryDelay = config.retryDelay || 1000;
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await this.client.request<T>(config);
        const duration = Date.now() - startTime;

        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          duration,
        };
      } catch (error) {
        lastError = error;

        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          this.logger.warn(
            `HTTP request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
            {
              context: 'HttpService',
              url: config.url,
              errorMessage: (error as Error).message,
            },
          );
          await this.sleep(delay);
        }
      }
    }

    throw this.formatError(lastError);
  }

  /**
   * Download file as buffer
   */
  async downloadFile(url: string, config?: HttpRequestConfig): Promise<Buffer> {
    const response = await this.client.get(url, {
      ...config,
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  /**
   * Download file as stream
   */
  async downloadStream(url: string, config?: HttpRequestConfig): Promise<NodeJS.ReadableStream> {
    const response = await this.client.get(url, {
      ...config,
      responseType: 'stream',
    });
    return response.data;
  }

  /**
   * Upload file
   */
  async uploadFile(
    url: string,
    file: Buffer | NodeJS.ReadableStream,
    filename: string,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<any>> {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', file, filename);

    return this.post(url, form, {
      ...config,
      headers: {
        ...config?.headers,
        ...form.getHeaders(),
      },
    });
  }

  /**
   * Make parallel requests
   */
  async parallel<T = any>(
    requests: Array<{ url: string; method?: string; data?: any; config?: HttpRequestConfig }>,
  ): Promise<Array<HttpResponse<T> | HttpError>> {
    const promises = requests.map(async (req) => {
      try {
        const method = (req.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'delete';
        if (method === 'get' || method === 'delete') {
          return await this[method]<T>(req.url, req.config);
        } else {
          return await this[method]<T>(req.url, req.data, req.config);
        }
      } catch (error) {
        return this.formatError(error);
      }
    });

    return Promise.all(promises);
  }

  /**
   * Create a new instance with custom config
   */
  createInstance(config: AxiosRequestConfig): AxiosInstance {
    const instance = axios.create({
      ...this.client.defaults,
      ...config,
    });

    // Copy interceptors
    instance.interceptors.request = this.client.interceptors.request;
    instance.interceptors.response = this.client.interceptors.response;

    return instance;
  }

  /**
   * Set default headers
   */
  setDefaultHeader(name: string, value: string): void {
    this.client.defaults.headers.common[name] = value;
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(name: string): void {
    delete this.client.defaults.headers.common[name];
  }

  /**
   * Check if URL is reachable
   */
  async isReachable(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.head(url, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get underlying axios instance
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  private formatError(error: any): HttpError {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code,
      };
    }

    return {
      message: error.message || 'Unknown error',
    };
  }

  private getFromCache(key: string): HttpResponse | null {
    const cached = this.requestCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    this.requestCache.delete(key);
    return null;
  }

  private storeInCache(key: string, data: HttpResponse, ttl: number = 300000): void {
    this.requestCache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCache) {
      if (value.expiresAt < now) {
        this.requestCache.delete(key);
      }
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  private getServiceName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.split('.').slice(-2, -1)[0] || hostname;
    } catch {
      return 'unknown';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requestCache.clear();
  }
}
