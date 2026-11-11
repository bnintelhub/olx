import { buildApp } from './app';
import { env } from './config/env';

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 [MediaService] Local Storage Engine running at http://${env.HOST}:${env.PORT}`);
    console.log(`📁 [MediaService] Persistent MEDIA_ROOT: ${env.MEDIA_ROOT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();

