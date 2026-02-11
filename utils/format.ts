/** Format a timestamp to a readable string */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Format a timestamp to relative date or time */
export function formatRelative(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;

  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(ts);

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Truncate text with ellipsis */
export function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}
