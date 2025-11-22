import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { s3Storage } from '../storage/s3';

interface MediaDownloadResult {
  s3Url: string;
  size: number;
  sha256: string;
}

/**
 * Download WhatsApp media file and upload to S3
 */
export async function downloadWhatsAppMedia(
  mediaId: string,
  traceId: string
): Promise<MediaDownloadResult> {
  const childLogger = logger.child({ traceId });

  try {
    // Step 1: Get media URL from WhatsApp API
    const mediaInfoUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
    const mediaInfoResponse = await axios.get(mediaInfoUrl, {
      headers: {
        Authorization: `Bearer ${config.whatsappAccessToken}`,
      },
    });

    const mediaUrl = mediaInfoResponse.data.url;
    const mimeType = mediaInfoResponse.data.mime_type;

    // Step 2: Download media file
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        Authorization: `Bearer ${config.whatsappAccessToken}`,
      },
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(mediaResponse.data);
    const size = buffer.length;

    // Step 3: Upload to S3
    const extension = getExtensionFromMimeType(mimeType);
    const filename = `${mediaId}.${extension}`;

    const { url, sha256 } = await s3Storage.uploadWhatsAppMedia(
      buffer,
      filename,
      mimeType,
      mediaId
    );

    childLogger.info(`Media downloaded and uploaded: ${mediaId} -> ${url}`);

    return {
      s3Url: url,
      size,
      sha256,
    };
  } catch (error) {
    childLogger.error(`Failed to download WhatsApp media: ${mediaId}`, error);
    throw error;
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/amr': 'amr',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };

  return mimeMap[mimeType] || 'bin';
}
