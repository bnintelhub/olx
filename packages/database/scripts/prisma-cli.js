const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Candidate env files across monorepo root and database package
const candidates = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../.env.production'),
  path.resolve(__dirname, '../../../.env.development'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../.env.production'),
  path.resolve(__dirname, '../../.env.development'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../prisma/.env'),
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
      // Ignore read errors
    }
  }
}

const args = process.argv.slice(2);
const isWin = process.platform === 'win32';
const prismaBin = path.resolve(
  __dirname,
  '../node_modules/.bin',
  isWin ? 'prisma.cmd' : 'prisma'
);
const cmd = fs.existsSync(prismaBin) ? prismaBin : 'npx prisma';

const res = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
});

process.exit(res.status ?? 0);

