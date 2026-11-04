import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { AppError } from '../../shared/errors/app-error';
import { APP_CONSTANTS } from '../../config/constants';
import { requireCapability } from '../../plugins/auth.plugin';
import { AccountCapabilities } from '../../shared/auth/rbac';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export class UploadsController {
  static async uploadImages(request: FastifyRequest, reply: FastifyReply) {
    if (!request.isMultipart()) {
      throw new AppError(400, 'INVALID_MULTIPART', 'Request is not multipart');
    }

    const parts = request.files();
    const uploadedFiles: Array<{
      url: string;
      thumbnailUrl: string;
      displayUrl: string;
      originalName: string;
      sortOrder: number;
      isCover: boolean;
    }> = [];

    let count = 0;
    const host = request.headers.host || 'localhost:5000';
    const protocol = request.protocol === 'https' ? 'https' : 'http';

    for await (const part of parts) {
      count++;
      if (count > APP_CONSTANTS.MAX_IMAGE_COUNT) {
        throw new AppError(400, 'IMAGE_COUNT_LIMIT', `Maximum of ${APP_CONSTANTS.MAX_IMAGE_COUNT} images allowed`);
      }

      const mimeType = part.mimetype;
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(mimeType)) {
        throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, and WebP images are allowed');
      }

      const ext = path.extname(part.filename).toLowerCase() || '.jpg';
      const uniqueName = `ad-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const savePath = path.join(uploadDir, uniqueName);

      await pipeline(part.file, fs.createWriteStream(savePath));

      const fileUrl = `${protocol}://${host}/uploads/${uniqueName}`;
      uploadedFiles.push({
        url: fileUrl,
        thumbnailUrl: fileUrl,
        displayUrl: fileUrl,
        originalName: part.filename,
        sortOrder: count - 1,
        isCover: count === 1,
      });
    }

    if (uploadedFiles.length === 0) {
      throw new AppError(400, 'NO_FILES_UPLOADED', 'Please upload at least one image file');
    }

    return reply.status(200).send({
      success: true,
      data: uploadedFiles,
    });
  }
}

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/upload-images',
    { preHandler: [fastify.authenticate, requireCapability(AccountCapabilities.CAN_SELL)] },
    UploadsController.uploadImages
  );
}
