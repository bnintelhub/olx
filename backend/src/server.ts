import { Server as SocketIOServer } from 'socket.io';
import { buildApp } from './app';
import { env } from './config/env';
import { initRedis, redis } from './config/redis';
import { checkDatabaseConnection, prisma } from './config/prisma';
import { setupChatSocket } from './modules/chat/chat.socket';

async function startServer() {
  try {
    // 1. Initialize Redis
    await initRedis();

    // 2. Build Fastify app
    const app = await buildApp();

    // 3. Attach Socket.IO
    const io = new SocketIOServer(app.server, {
      cors: {
        origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:80'],
        credentials: true,
      },
    });

    setupChatSocket(io);

    // 4. Start HTTP Server
    const port = env.PORT || 5000;
    await app.listen({ port, host: '0.0.0.0' });

    const dbStatus = await checkDatabaseConnection();

    console.log(`\n======================================================`);
    console.log(`🚀 OLX Marketplace Modular Fastify API is running!`);
    console.log(`📡 URL: http://localhost:${port}/api/v1/health`);
    console.log(`📚 Swagger Docs: http://localhost:${port}/docs`);
    console.log(`⚡ Real-Time Socket.IO: Activated`);
    console.log(`🗄️ Database: PostgreSQL 16 (${dbStatus ? 'Connected' : 'Pending'})`);
    console.log(`⚡ Cache: Redis 7 (${redis.status === 'ready' || redis.status === 'connect' ? 'Connected' : 'Connecting'})`);
    console.log(`📱 SMS Gateway: ${env.SMS_PROVIDER} (Mock Code: ${env.MOCK_OTP_CODE})`);
    console.log(`======================================================\n`);

    // Graceful Shutdown
    const closeGracefully = async (signal: string) => {
      console.log(`\nReceived ${signal}, closing server gracefully...`);
      io.close();
      await app.close();
      await prisma.$disconnect();
      redis.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  } catch (err: any) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

void startServer();
