import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys for Kafka decorators
 */
export const KAFKA_SUBSCRIBER_METADATA = 'KAFKA_SUBSCRIBER_METADATA';
export const KAFKA_TOPIC_METADATA = 'KAFKA_TOPIC_METADATA';
export const KAFKA_GROUP_METADATA = 'KAFKA_GROUP_METADATA';

/**
 * Kafka subscriber metadata interface
 */
export interface KafkaSubscriberMetadata {
  topic: string;
  groupId: string;
}

/**
 * Decorator to mark a class as a Kafka subscriber
 * @param groupId - Consumer group ID
 */
export function KafkaSubscriber(groupId: string): ClassDecorator {
  return (target: Function) => {
    SetMetadata(KAFKA_GROUP_METADATA, groupId)(target);
  };
}

/**
 * Decorator to mark a method as a Kafka topic handler
 * @param topic - Topic name to subscribe to
 */
export function KafkaTopicHandler(topic: string): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(KAFKA_TOPIC_METADATA, topic)(target, propertyKey, descriptor);

    // Store metadata on the method
    const existingTopics = Reflect.getMetadata(KAFKA_SUBSCRIBER_METADATA, target.constructor) || [];
    Reflect.defineMetadata(
      KAFKA_SUBSCRIBER_METADATA,
      [...existingTopics, { topic, handler: propertyKey }],
      target.constructor,
    );

    return descriptor;
  };
}

/**
 * Decorator to extract message payload
 */
export function KafkaPayload(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingPayloads =
      Reflect.getMetadata('KAFKA_PAYLOAD_METADATA', target, propertyKey as string) || [];
    existingPayloads.push(parameterIndex);
    Reflect.defineMetadata('KAFKA_PAYLOAD_METADATA', existingPayloads, target, propertyKey as string);
  };
}

/**
 * Decorator to extract message key
 */
export function KafkaKey(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    Reflect.defineMetadata('KAFKA_KEY_METADATA', parameterIndex, target, propertyKey as string);
  };
}

/**
 * Decorator to extract message headers
 */
export function KafkaHeaders(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    Reflect.defineMetadata('KAFKA_HEADERS_METADATA', parameterIndex, target, propertyKey as string);
  };
}

/**
 * Decorator to extract message metadata (topic, partition, offset, timestamp)
 */
export function KafkaMetadata(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    Reflect.defineMetadata('KAFKA_METADATA_INDEX', parameterIndex, target, propertyKey as string);
  };
}
