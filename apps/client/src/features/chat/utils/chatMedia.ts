export function formatAttachmentUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // Strip any host/origin and repeated media/uploads prefixes so it routes cleanly through Vite's dev proxy /media/
  let clean = url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^s3:\/\/[^/]+/, '')
    .replace(/^[/\\]+/, '')
    .trim();

  while (/^(?:media|olx-media|uploads)[/\\]/i.test(clean)) {
    clean = clean.replace(/^(?:media|olx-media|uploads)[/\\]/i, '').replace(/^[/\\]+/, '');
  }

  return clean ? `/media/${clean}` : '';
}

