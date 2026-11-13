import { apiRequest } from './httpClient';
import type { ApiResponse } from '../types/api';

export interface FileUploadResult {
  url: string;
  publicId: string;
  originalFilename: string;
  resourceType: string;
  format: string;
  bytes: number;
  uploadedAt: string;
}

/**
 * Tải một file (hình ảnh hoặc tài liệu PDF/Word) lên Cloudinary qua Backend API.
 *
 * @param file Đối tượng File lấy từ input hoặc drag & drop
 * @param folder Thư mục đích trên Cloudinary (mặc định: "mycropdiary/evidence")
 * @returns FileUploadResult chứa secure URL, publicId, kích thước và định dạng
 */
export async function uploadFileToCloudinary(
  file: File,
  folder: string = 'mycropdiary/evidence'
): Promise<FileUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await apiRequest<ApiResponse<FileUploadResult>>('/files/upload', {
    method: 'POST',
    data: formData,
  });

  if (!response?.success || !response.data) {
    throw new Error(response?.message || 'Tải lên tập tin thất bại.');
  }

  return response.data;
}

/**
 * Tải nhiều file cùng lúc lên Cloudinary qua Backend API.
 */
export async function uploadMultipleFilesToCloudinary(
  files: File[],
  folder: string = 'mycropdiary/evidence'
): Promise<FileUploadResult[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  formData.append('folder', folder);

  const response = await apiRequest<ApiResponse<FileUploadResult[]>>('/files/upload-multiple', {
    method: 'POST',
    data: formData,
  });

  if (!response?.success || !response.data) {
    throw new Error(response?.message || 'Tải lên các tập tin thất bại.');
  }

  return response.data;
}

/**
 * Xóa file trên Cloudinary qua Backend API.
 */
export async function deleteUploadedFile(publicId: string): Promise<boolean> {
  const response = await apiRequest<ApiResponse<boolean>>(`/files/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
  });
  return Boolean(response?.data);
}

export interface EvidenceFileItem {
  name: string;
  url: string;
  size?: number;
  type?: string;
  publicId?: string;
}

export function parseEvidenceFiles(raw?: string | null): EvidenceFileItem[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();

  // JSON Array format
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item === 'object' && Boolean(item.url))
          .map((item, idx) => ({
            name: item.name || `Tài liệu minh chứng ${idx + 1}`,
            url: item.url,
            size: typeof item.size === 'number' ? item.size : undefined,
            type: item.type,
            publicId: item.publicId,
          }));
      }
    } catch {
      // Fall through to plain text parsing
    }
  }

  // Single or comma/newline separated URLs
  return trimmed
    .split(/[\n,;]+/)
    .map((url) => url.trim())
    .filter((url) => Boolean(url) && /^https?:\/\//i.test(url))
    .map((url, idx) => {
      let name = `Tài liệu minh chứng ${idx + 1}`;
      try {
        const u = new URL(url);
        const segments = u.pathname.split('/');
        const last = segments[segments.length - 1];
        if (last && last.includes('.')) {
          name = decodeURIComponent(last);
        }
      } catch {
        // use default name
      }
      return { name, url };
    });
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Lấy URL xem trước thân thiện trên web:
 * Đối với file PDF trên Cloudinary: thay .pdf bằng .jpg để Cloudinary tự render trang 1 thành ảnh,
 * tránh hoàn toàn lỗi '401 deny or ACL failure' trên các tài khoản Cloudinary chưa bật public delivery cho PDF.
 */
export function getWebPreviewUrl(url: string): { previewUrl: string; isConvertedPdf: boolean; isImage: boolean } {
  if (!url) return { previewUrl: '', isConvertedPdf: false, isImage: false };
  const isPdf = /\.pdf(\?.*)?$/i.test(url);
  const isCloudinary = /res\.cloudinary\.com/i.test(url);

  if (isPdf && isCloudinary) {
    const jpgUrl = url.replace(/\.pdf(\?.*)?$/i, '.jpg');
    return { previewUrl: jpgUrl, isConvertedPdf: true, isImage: true };
  }

  const isImage = /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(url) || /\/image\/upload\//i.test(url);
  return { previewUrl: url, isConvertedPdf: false, isImage };
}
