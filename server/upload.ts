import { randomUUID } from 'crypto';

interface UploadResult {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export async function uploadFile(fileBuffer: Buffer, originalName: string, mimetype: string): Promise<UploadResult> {
  try {
    // Для аватаров просто конвертируем в base64 без изменения размера
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${mimetype};base64,${base64Data}`;
    
    console.log('Converted to base64, size:', dataUrl.length);
    
    return {
      url: dataUrl, // Храним как data URL без изменения размера
      filename: originalName,
      mimetype,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw new Error('Failed to process file');
  }
}