import {
  format,
  formatDistance,
  formatDistanceToNow,
  formatRelative,
  parseISO,
  isValid,
  isBefore,
  isAfter,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  isThisYear,
  isPast,
  isFuture,
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subMinutes,
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  getDay,
  getMonth,
  getYear,
  getHours,
  getMinutes,
  getSeconds,
  setHours,
  setMinutes,
  setSeconds,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  intervalToDuration,
  formatDuration as fnsFormatDuration,
  isWithinInterval,
  areIntervalsOverlapping,
  max,
  min,
  closestTo,
} from 'date-fns';
import { enUS } from 'date-fns/locale';

// Re-export commonly used date-fns functions
export {
  format,
  formatDistance,
  formatDistanceToNow,
  formatRelative,
  parseISO,
  isValid,
  isBefore,
  isAfter,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  isThisYear,
  isPast,
  isFuture,
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subMinutes,
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  getDay,
  getMonth,
  getYear,
  getHours,
  getMinutes,
  getSeconds,
  setHours,
  setMinutes,
  setSeconds,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  intervalToDuration,
  isWithinInterval,
  areIntervalsOverlapping,
  max as maxDate,
  min as minDate,
  closestTo,
};

/**
 * Default date format patterns
 */
export const DateFormats = {
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  DATE: 'yyyy-MM-dd',
  DATE_DISPLAY: 'MMM d, yyyy',
  DATE_FULL: 'EEEE, MMMM d, yyyy',
  TIME: 'HH:mm:ss',
  TIME_SHORT: 'HH:mm',
  TIME_12H: 'h:mm a',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  DATETIME_DISPLAY: 'MMM d, yyyy h:mm a',
  DATETIME_FULL: 'EEEE, MMMM d, yyyy h:mm a',
  MONTH_YEAR: 'MMMM yyyy',
  DAY_MONTH: 'd MMM',
} as const;

/**
 * Parse a date from various formats
 */
export function parseDate(date: string | number | Date): Date {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'number') {
    return new Date(date);
  }
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : new Date(date);
}

/**
 * Safely parse a date, returning null if invalid
 */
export function safeParsDate(date: string | number | Date | null | undefined): Date | null {
  if (!date) return null;
  try {
    const parsed = parseDate(date);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format a date with the specified format
 */
export function formatDate(
  date: string | number | Date,
  formatStr: string = DateFormats.DATE_DISPLAY,
): string {
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return 'Invalid Date';
  }
  return format(parsed, formatStr, { locale: enUS });
}

/**
 * Format a date for display in chat messages
 * Returns relative time for recent messages, otherwise date
 */
export function formatChatTime(date: string | number | Date): string {
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return '';
  }

  if (isToday(parsed)) {
    return format(parsed, DateFormats.TIME_12H);
  }

  if (isYesterday(parsed)) {
    return 'Yesterday';
  }

  if (isThisWeek(parsed)) {
    return format(parsed, 'EEEE');
  }

  if (isThisYear(parsed)) {
    return format(parsed, DateFormats.DAY_MONTH);
  }

  return format(parsed, DateFormats.DATE);
}

/**
 * Format a date for message timestamps
 */
export function formatMessageTime(date: string | number | Date): string {
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return '';
  }

  if (isToday(parsed)) {
    return format(parsed, DateFormats.TIME_12H);
  }

  if (isYesterday(parsed)) {
    return `Yesterday ${format(parsed, DateFormats.TIME_12H)}`;
  }

  if (isThisWeek(parsed)) {
    return `${format(parsed, 'EEE')} ${format(parsed, DateFormats.TIME_12H)}`;
  }

  return format(parsed, DateFormats.DATETIME_DISPLAY);
}

/**
 * Get human-readable relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(
  date: string | number | Date,
  options: { addSuffix?: boolean; includeSeconds?: boolean } = {},
): string {
  const { addSuffix = true, includeSeconds = false } = options;
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return '';
  }
  return formatDistanceToNow(parsed, { addSuffix, includeSeconds, locale: enUS });
}

/**
 * Get time difference between two dates in a human-readable format
 */
export function getTimeDifference(
  dateLeft: string | number | Date,
  dateRight: string | number | Date,
): string {
  const left = parseDate(dateLeft);
  const right = parseDate(dateRight);
  if (!isValid(left) || !isValid(right)) {
    return '';
  }
  return formatDistance(left, right, { locale: enUS });
}

/**
 * Format a duration in milliseconds to human-readable string
 */
export function formatDurationMs(ms: number): string {
  const duration = intervalToDuration({ start: 0, end: ms });
  return fnsFormatDuration(duration, {
    format: ['hours', 'minutes', 'seconds'],
    zero: false,
    delimiter: ' ',
  });
}

/**
 * Format call duration (for audio/video calls)
 */
export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get date range for analytics/reports
 */
export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(
  period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear',
): DateRange {
  const now = new Date();

  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'thisWeek':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'lastWeek':
      const lastWeek = subWeeks(now, 1);
      return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'thisYear':
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

/**
 * Get custom date range from days ago
 */
export function getDateRangeFromDaysAgo(daysAgo: number): DateRange {
  const now = new Date();
  return {
    start: startOfDay(subDays(now, daysAgo)),
    end: endOfDay(now),
  };
}

/**
 * Check if a date is within a date range
 */
export function isDateInRange(date: string | number | Date, range: DateRange): boolean {
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return false;
  }
  return isWithinInterval(parsed, range);
}

/**
 * Get an array of dates between two dates
 */
export function getDatesBetween(
  start: string | number | Date,
  end: string | number | Date,
): Date[] {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!isValid(startDate) || !isValid(endDate)) {
    return [];
  }
  return eachDayOfInterval({ start: startDate, end: endDate });
}

/**
 * Calculate age from birthdate
 */
export function calculateAge(birthDate: string | number | Date): number {
  const parsed = parseDate(birthDate);
  if (!isValid(parsed)) {
    return 0;
  }
  return differenceInYears(new Date(), parsed);
}

/**
 * Check if a timestamp has expired
 */
export function isExpired(expiresAt: string | number | Date): boolean {
  const parsed = parseDate(expiresAt);
  if (!isValid(parsed)) {
    return true;
  }
  return isPast(parsed);
}

/**
 * Get expiration date from TTL (time-to-live) in seconds
 */
export function getExpirationDate(ttlSeconds: number, from: Date = new Date()): Date {
  return addMinutes(from, ttlSeconds / 60);
}

/**
 * Get time remaining until expiration
 */
export function getTimeRemaining(expiresAt: string | number | Date): {
  expired: boolean;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  formatted: string;
} {
  const parsed = parseDate(expiresAt);
  if (!isValid(parsed)) {
    return { expired: true, seconds: 0, minutes: 0, hours: 0, days: 0, formatted: 'Expired' };
  }

  const now = new Date();
  if (isPast(parsed)) {
    return { expired: true, seconds: 0, minutes: 0, hours: 0, days: 0, formatted: 'Expired' };
  }

  return {
    expired: false,
    seconds: differenceInSeconds(parsed, now),
    minutes: differenceInMinutes(parsed, now),
    hours: differenceInHours(parsed, now),
    days: differenceInDays(parsed, now),
    formatted: getRelativeTime(parsed, { addSuffix: false }),
  };
}

/**
 * Format last seen status
 */
export function formatLastSeen(lastSeen: string | number | Date | null): string {
  if (!lastSeen) {
    return 'Never';
  }

  const parsed = parseDate(lastSeen);
  if (!isValid(parsed)) {
    return 'Unknown';
  }

  const now = new Date();
  const diffMinutes = differenceInMinutes(now, parsed);

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 5) {
    return 'Active';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (isToday(parsed)) {
    return `Today at ${format(parsed, DateFormats.TIME_12H)}`;
  }

  if (isYesterday(parsed)) {
    return `Yesterday at ${format(parsed, DateFormats.TIME_12H)}`;
  }

  return formatDate(parsed, DateFormats.DATETIME_DISPLAY);
}

/**
 * Get message group date header
 */
export function getMessageDateHeader(date: string | number | Date): string {
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return '';
  }

  if (isToday(parsed)) {
    return 'Today';
  }

  if (isYesterday(parsed)) {
    return 'Yesterday';
  }

  if (isThisWeek(parsed)) {
    return format(parsed, 'EEEE');
  }

  if (isThisYear(parsed)) {
    return format(parsed, 'MMMM d');
  }

  return format(parsed, DateFormats.DATE_DISPLAY);
}

/**
 * Convert UTC date to local timezone
 */
export function utcToLocal(utcDate: string | number | Date): Date {
  const parsed = parseDate(utcDate);
  if (!isValid(parsed)) {
    return new Date();
  }
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
}

/**
 * Convert local date to UTC
 */
export function localToUtc(localDate: string | number | Date): Date {
  const parsed = parseDate(localDate);
  if (!isValid(parsed)) {
    return new Date();
  }
  return new Date(parsed.getTime() + parsed.getTimezoneOffset() * 60000);
}

/**
 * Get ISO string for a date (for API responses)
 */
export function toISOString(date: string | number | Date): string {
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

/**
 * Get Unix timestamp (seconds since epoch)
 */
export function toUnixTimestamp(date: string | number | Date): number {
  const parsed = parseDate(date);
  if (!isValid(parsed)) {
    return Math.floor(Date.now() / 1000);
  }
  return Math.floor(parsed.getTime() / 1000);
}

/**
 * Convert Unix timestamp to Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
