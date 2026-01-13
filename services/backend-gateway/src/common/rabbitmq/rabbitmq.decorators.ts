import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys for RabbitMQ decorators
 */
export const RABBITMQ_CONSUMER_METADATA = 'RABBITMQ_CONSUMER_METADATA';
export const RABBITMQ_QUEUE_METADATA = 'RABBITMQ_QUEUE_METADATA';
export const RABBITMQ_EXCHANGE_METADATA = 'RABBITMQ_EXCHANGE_METADATA';

/**
 * RabbitMQ consumer metadata interface
 */
export interface RabbitMQConsumerMetadata {
  queue: string;
  exchange?: string;
  routingKey?: string;
}

/**
 * Decorator to mark a class as a RabbitMQ consumer
 */
export function RabbitMQConsumer(): ClassDecorator {
  return (target: Function) => {
    SetMetadata(RABBITMQ_CONSUMER_METADATA, true)(target);
  };
}

/**
 * Decorator to mark a method as a queue message handler
 * @param queue - Queue name to consume from
 * @param options - Optional exchange and routing key configuration
 */
export function RabbitMQQueueHandler(
  queue: string,
  options?: { exchange?: string; routingKey?: string },
): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const metadata: RabbitMQConsumerMetadata = {
      queue,
      exchange: options?.exchange,
      routingKey: options?.routingKey,
    };

    SetMetadata(RABBITMQ_QUEUE_METADATA, metadata)(target, propertyKey, descriptor);

    // Store metadata on the method
    const existingQueues =
      Reflect.getMetadata(RABBITMQ_CONSUMER_METADATA, target.constructor) || [];
    Reflect.defineMetadata(
      RABBITMQ_CONSUMER_METADATA,
      [...existingQueues, { ...metadata, handler: propertyKey }],
      target.constructor,
    );

    return descriptor;
  };
}

/**
 * Decorator to bind a method to an exchange with routing key
 * @param exchange - Exchange name
 * @param routingKey - Routing key pattern
 */
export function RabbitMQSubscribe(exchange: string, routingKey: string): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const metadata = { exchange, routingKey };
    SetMetadata(RABBITMQ_EXCHANGE_METADATA, metadata)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * Decorator to extract message payload
 */
export function RabbitMQPayload(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingPayloads =
      Reflect.getMetadata('RABBITMQ_PAYLOAD_METADATA', target, propertyKey as string) || [];
    existingPayloads.push(parameterIndex);
    Reflect.defineMetadata(
      'RABBITMQ_PAYLOAD_METADATA',
      existingPayloads,
      target,
      propertyKey as string,
    );
  };
}

/**
 * Decorator to extract message properties
 */
export function RabbitMQProperties(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    Reflect.defineMetadata(
      'RABBITMQ_PROPERTIES_METADATA',
      parameterIndex,
      target,
      propertyKey as string,
    );
  };
}

/**
 * Decorator to extract message headers
 */
export function RabbitMQHeaders(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    Reflect.defineMetadata(
      'RABBITMQ_HEADERS_METADATA',
      parameterIndex,
      target,
      propertyKey as string,
    );
  };
}

/**
 * Decorator to extract delivery info (exchange, routingKey, deliveryTag)
 */
export function RabbitMQDeliveryInfo(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    Reflect.defineMetadata(
      'RABBITMQ_DELIVERY_METADATA',
      parameterIndex,
      target,
      propertyKey as string,
    );
  };
}
