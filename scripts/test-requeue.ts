import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env') });

import { prisma } from '../apps/server/src/config/prisma';
import { mediaQueue } from '../apps/server/src/jobs/media.job';

async function testRequeue() {
  const mediaId = 'med_mw3l95rddac0cb477fe6';
  const tempPath = 'E:\\bn-projects\\olx-srv\\olx\\uploads\\temp\\temp_replace_med_mw3l95rddac0cb477fe6_1793929943590.tmp';

  console.log('1. Checking existing job in BullMQ...');
  const oldJob = await mediaQueue.getJob(mediaId);
  if (oldJob) {
    console.log('Old job found with state:', await oldJob.getState());
    console.log('Removing old completed job from Redis...');
    await oldJob.remove();
    console.log('Old job removed!');
  }

  console.log('2. Adding new job to BullMQ with unique jobId...');
  const newJob = await mediaQueue.add('process-image', {
    mediaId,
    tempPath,
    userId: '31d7568c-811f-4bf9-9008-fd00ec3fa52b',
    originalName: 'ahmet-hikmet-turan-rRZcQ64Bm04-unsplash.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1623418,
    baseUrl: 'http://localhost:5000',
    resource: 'ads',
    resourceId: 'b2f75712-4756-426f-8031-d7db8b890133',
    mediaType: 'images',
  }, {
    jobId: `${mediaId}_test_${Date.now()}`
  });

  console.log('New job enqueued! Job ID:', newJob.id);

  console.log('3. Waiting 5 seconds for background worker to process...');
  await new Promise(r => setTimeout(r, 5000));

  const updatedRecord = await prisma.media.findUnique({ where: { id: mediaId } });
  console.log('Updated Record in DB:', {
    id: updatedRecord?.id,
    status: updatedRecord?.status,
    width: updatedRecord?.width,
    height: updatedRecord?.height,
    variants: updatedRecord?.variants
  });

  await mediaQueue.close();
  await prisma.$disconnect();
  process.exit(0);
}

testRequeue().catch(console.error);

