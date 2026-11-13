import fs from 'fs';
import path from 'path';

/**
 * Universal Media Root Resolver
 * ---------------------------------------------------------------------------
 * Correctly resolves the persistent media storage directory across:
 * 1. Docker containers (Linux paths like /data/olx-media)
 * 2. Host development environments (Windows/macOS monorepo paths like olx/data/olx-media)
 */
export function resolveMediaRoot(customPath?: string): string {
  // 0. Primary Docker persistent volume mount (/data/olx-media)
  if (fs.existsSync('/data/olx-media')) {
    return '/data/olx-media';
  }

  // 1. Explicit path given and exists
  if (customPath) {
    const resolvedCustom = path.resolve(customPath);
    if (fs.existsSync(resolvedCustom)) {
      return resolvedCustom;
    }
  }

  // 2. Explicit MEDIA_ROOT environment variable that exists on disk
  if (process.env.MEDIA_ROOT) {
    const resolvedEnv = path.resolve(process.env.MEDIA_ROOT);
    if (fs.existsSync(resolvedEnv)) {
      return resolvedEnv;
    }
  }

  // 3. Locate monorepo root via pnpm-workspace.yaml
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      const workspaceCandidate = path.join(current, 'data', 'olx-media');
      if (!fs.existsSync(workspaceCandidate)) {
        try {
          fs.mkdirSync(workspaceCandidate, { recursive: true });
        } catch {
          // ignore
        }
      }
      return workspaceCandidate;
    }
    current = path.dirname(current);
  }

  // 4. Default fallback to current working directory
  const fallback = path.resolve(
    process.env.MEDIA_ROOT || path.join(process.cwd(), 'data', 'olx-media')
  );
  if (!fs.existsSync(fallback)) {
    try {
      fs.mkdirSync(fallback, { recursive: true });
    } catch {
      // ignore
    }
  }
  return fallback;
}

