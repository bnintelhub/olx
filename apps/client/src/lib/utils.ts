import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number into INR currency format
export function formatCurrency(amount: number | string): string {
  const num = Number(amount);
  if (isNaN(num)) return '₹ --';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

// Format date into human-readable Indian format
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

// Format relative time: "Just now", "2 hr ago", "3 days ago"
export function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Format posting date for product specs e.g. "09-OCT-26"
export function formatPostingDate(dateString?: string): string {
  if (!dateString) return 'Today';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

// Format relative/backend media URLs for browser consumption
export function formatMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    if (!/localhost|127\.0\.0\.1|0\.0\.0\.0|server|backend|admin|client/i.test(trimmed)) {
      return trimmed;
    }
  }

  let clean = trimmed
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^s3:\/\/[^/]+/, '')
    .replace(/^[/\\]+/, '')
    .trim();

  while (/^(?:media|olx-media|uploads)[/\\]/i.test(clean)) {
    clean = clean.replace(/^(?:media|olx-media|uploads)[/\\]/i, '').replace(/^[/\\]+/, '');
  }

  clean = clean.replace(/(\/image\.webp)+$/i, '/image.webp');

  return clean ? `/media/${clean}` : '';
}

