import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env') });

import { prisma } from '../apps/server/src/config/prisma';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { env } from '../apps/server/src/config/env';
import { mediaQueue, mediaDeadLetterQueue } from '../apps/server/src/jobs/media.job';

async function main() {
  const mediaId = 'med_mw3l95rddac0cb477fe6';
  console.log('--- 1. DATABASE RECORD ---');
  const record = await prisma.media.findUnique({ where: { id: mediaId } });
  console.log('DB Record:', JSON.stringify(record, null, 2));

  console.log('\n--- 2. MINIO / S3 CHECK ---');
  const s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: { accessKeyId: env.S3_ACCESS_KEY || '', secretAccessKey: env.S3_SECRET_KEY || '' },
    forcePathStyle: true,
  });

  try {
    const s3Res = await s3.send(new ListObjectsV2Command({
      Bucket: env.S3_BUCKET,
      Prefix: 'ads/b2f75712-4756-426f-8031-d7db8b890133/images/med_mw3l95rddac0cb477fe6',
    }));
    console.log('S3 Objects found:', s3Res.Contents?.map(c => c.Key) || 'None');
  } catch (err: any) {
    console.error('S3 error:', err.message);
  }

  console.log('\n--- 3. BULLMQ JOB CHECK ---');
  try {
    const job = await mediaQueue.getJob(mediaId);
    if (job) {
      console.log('BullMQ Job State:', await job.getState());
      console.log('BullMQ Job Failed Reason:', job.failedReason);
      console.log('BullMQ Job Attempts:', job.attemptsMade);
      console.log('BullMQ Job Data:', job.data);
    } else {
      console.log('No BullMQ job found with ID:', mediaId);
    }
  } catch (err: any) {
    console.error('BullMQ error:', err.message);
  }

  await prisma.$disconnect();
  await mediaQueue.close();
  await mediaDeadLetterQueue.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
