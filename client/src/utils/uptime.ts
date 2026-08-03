/**
 * Formats a duration given in seconds as a compact human-readable string.
 * Examples:
 *   45      -> "45s"
 *   125     -> "2m 5s"
 *   3725    -> "1h 2m"
 *   90061   -> "1d 1h 1m 1s"
 *   0       -> "0s"
 */
export const formatUptime = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

