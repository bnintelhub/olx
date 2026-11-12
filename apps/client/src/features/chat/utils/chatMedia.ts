export function formatAttachmentUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // Strip Docker internal hostnames and leading origin
  let clean = url
    .replace(/^https?:\/\/(?:server|backend):5000/i, '')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^s3:\/\/[^/]+/i, '')
    .replace(/^[/\\]+/, '')
    .trim();

  // Strip repeated media prefixes
  while (/^(?:media|olx-media|uploads)[/\\]/i.test(clean)) {
    clean = clean.replace(/^(?:media|olx-media|uploads)[/\\]/i, '').replace(/^[/\\]+/, '');
  }

  return clean ? `/media/${clean}` : '';
}

