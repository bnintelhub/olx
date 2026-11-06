import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env') });

import { mediaQueue } from '../apps/server/src/jobs/media.job';

async function check() {
  const workers = await mediaQueue.getWorkers();
  console.log('ACTIVE WORKERS COUNT:', workers.length);
  console.log('WORKERS:', workers);
  await mediaQueue.close();
  process.exit(0);
}

check().catch(console.error);

