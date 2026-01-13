import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private trimValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.trimValue(item));
    }

    if (this.isObject(value)) {
      const trimmedObject: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        trimmedObject[key] = this.trimValue(value[key]);
      }
      return trimmedObject;
    }

    return value;
  }

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'body') {
      return this.trimValue(value);
    }
    return value;
  }
}
