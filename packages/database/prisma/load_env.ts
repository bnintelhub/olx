import path from 'path';
import fs from 'fs';

// Auto-load .env from candidate paths
const candidates = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../.env.production'),
  path.resolve(__dirname, '../../../.env.development'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../.env.production'),
  path.resolve(__dirname, '../../.env.development'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, './.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.production'),
];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx > 0) {
          const key = line.slice(0, idx).trim();
          let val = line.slice(idx + 1).trim();
          val = val.replace(/^['"](.*)['"]$/, '$1');
          if (!process.env[key] && val) {
            process.env[key] = val;
          }
        }
      }
    } catch {
      // Ignore
    }
  }
}
