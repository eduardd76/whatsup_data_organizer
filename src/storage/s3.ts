import AWS from 'aws-sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { generateSha256 } from '../utils/crypto';

class S3Storage {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      endpoint: config.s3Endpoint,
      region: config.s3Region,
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
      s3ForcePathStyle: true, // Needed for MinIO
      signatureVersion: 'v4',
    });
  }

  /**
   * Upload a file to S3/R2
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: config.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata || {},
      };

      await this.s3.upload(params).promise();

      const url = `${config.s3Endpoint}/${config.s3Bucket}/${key}`;
      logger.info(`File uploaded successfully: ${url}`);

      return url;
    } catch (error) {
      logger.error(`Failed to upload file to S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Download a file from S3/R2
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: config.s3Bucket,
        Key: key,
      };

      const result = await this.s3.getObject(params).promise();

      if (!result.Body) {
        throw new Error('No data returned from S3');
      }

      return result.Body as Buffer;
    } catch (error) {
      logger.error(`Failed to download file from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists in S3/R2
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3
        .headObject({
          Bucket: config.s3Bucket,
          Key: key,
        })
        .promise();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file from S3/R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: config.s3Bucket,
          Key: key,
        })
        .promise();
      logger.info(`File deleted successfully: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete file from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Generate a unique S3 key for a file
   */
  generateKey(prefix: string, filename: string, buffer: Buffer): string {
    const hash = generateSha256(buffer);
    const ext = filename.split('.').pop();
    const timestamp = Date.now();
    return `${prefix}/${timestamp}-${hash.substring(0, 16)}.${ext}`;
  }

  /**
   * Upload WhatsApp media
   */
  async uploadWhatsAppMedia(
    buffer: Buffer,
    filename: string,
    contentType: string,
    whatsappMessageId: string
  ): Promise<{ url: string; key: string; sha256: string }> {
    const key = this.generateKey('whatsapp', filename, buffer);
    const sha256 = generateSha256(buffer);

    const url = await this.uploadFile(buffer, key, contentType, {
      whatsappMessageId,
      sha256,
    });

    return { url, key, sha256 };
  }
}

export const s3Storage = new S3Storage();
