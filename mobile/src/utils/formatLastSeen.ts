import { formatDistanceToNow } from 'date-fns';

export const formatLastSeen = (status: string, lastSeen?: string): string => {
  if (status === 'online') {
    return 'online';
  }

  if (!lastSeen) {
    return 'offline';
  }

  try {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));

    // If less than 1 minute ago
    if (diffInMinutes < 1) {
      return 'last seen just now';
    }

    // If less than 1 hour ago
    if (diffInMinutes < 60) {
      return `last seen ${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // If less than 24 hours ago
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `last seen ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    // If less than 7 days ago
    if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `last seen ${days} ${days === 1 ? 'day' : 'days'} ago`;
    }

    // Otherwise use date-fns for more readable format
    return `last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`;
  } catch (error) {
    return 'offline';
  }
};
