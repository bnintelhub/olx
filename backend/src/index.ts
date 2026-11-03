import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

import path from 'path';

const app = express();

// Security and utility middlewares with cross-origin resource policy for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// API Routes mounted under /api/v1
app.use('/api/v1', apiRouter);

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setupChatSocket } from './services/chat.socket';

// Global Error Handler
app.use(errorHandler);

const PORT = env.PORT || 5000;

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
});

setupChatSocket(io);

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 OLX ORBIT (OLX) API Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}/api/v1/health`);
  console.log(`⚡ Real-Time Socket.IO: Activated`);
  console.log(`🗄️ Database: MySQL 8.4 (olx_marketplace)`);
  console.log(`📱 SMS Gateway: ${env.SMS_PROVIDER} (Dev Mock OTP: ${env.MOCK_OTP_CODE})`);
  console.log(`======================================================\n`);
});
