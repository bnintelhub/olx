import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/app-error';

export const errorHandlerPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    const timestamp = new Date().toISOString();
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `req-${Math.random().toString(36).substring(2, 9)}`;

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Input validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            issue: e.message,
          })),
        },
        meta: { timestamp, path: request.url, requestId },
      });
    }

    // Custom AppError
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        meta: { timestamp, path: request.url, requestId },
      });
    }

    // Fastify schema validation errors
    if ((error as any).validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: error.message,
          details: (error as any).validation,
        },
        meta: { timestamp, path: request.url, requestId },
      });
    }

    // Fallback 500
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : null,
      },
      meta: { timestamp, path: request.url, requestId },
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
});
