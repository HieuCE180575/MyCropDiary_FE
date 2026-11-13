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
