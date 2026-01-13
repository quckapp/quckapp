import { Schema } from 'mongoose';

/**
 * Timestamp Plugin
 * Automatically adds and manages createdAt and updatedAt fields
 *
 * Note: Mongoose has built-in timestamps option, but this plugin provides
 * additional features like custom field names and timezone handling
 */

export interface TimestampPluginOptions {
  createdAtField?: string;
  updatedAtField?: string;
  useTimezone?: boolean;
  timezone?: string;
}

export function timestampPlugin(
  schema: Schema,
  options: TimestampPluginOptions = {},
): void {
  const {
    createdAtField = 'createdAt',
    updatedAtField = 'updatedAt',
    useTimezone = false,
    timezone = 'UTC',
  } = options;

  // Add fields if not already present
  if (!schema.path(createdAtField)) {
    schema.add({
      [createdAtField]: {
        type: Date,
        default: Date.now,
        immutable: true, // Prevent modification after creation
        index: true,
      },
    });
  }

  if (!schema.path(updatedAtField)) {
    schema.add({
      [updatedAtField]: {
        type: Date,
        default: Date.now,
        index: true,
      },
    });
  }

  // Pre-save middleware to update timestamps
  schema.pre('save', function (next) {
    const now = useTimezone ? getTimezoneDate(timezone) : new Date();

    if (this.isNew) {
      this.set(createdAtField, now);
    }
    this.set(updatedAtField, now);

    next();
  });

  // Pre-update middleware for findOneAndUpdate, updateOne, etc.
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    const now = useTimezone ? getTimezoneDate(timezone) : new Date();
    this.set({ [updatedAtField]: now });
    next();
  });

  // Add virtual for age (time since creation)
  schema.virtual('age').get(function () {
    const createdAt = this.get(createdAtField) as Date | undefined;
    if (!createdAt) return null;
    return Date.now() - new Date(createdAt as Date).getTime();
  });
}

function getTimezoneDate(timezone: string): Date {
  try {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const dateParts: Record<string, string> = {};
    parts.forEach((part) => {
      dateParts[part.type] = part.value;
    });

    return new Date(
      `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`,
    );
  } catch {
    return new Date();
  }
}
