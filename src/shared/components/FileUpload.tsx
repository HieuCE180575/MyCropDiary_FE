import { useState, type DragEvent } from 'react';
import {
  uploadFileToCloudinary,
  parseEvidenceFiles,
  formatFileSize,
  type EvidenceFileItem,
} from '../api/fileUploadService';
import { FilePreviewModal } from './FilePreviewModal';
import { Icon } from './Icon';

export interface FileUploadProps {
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  accept?: string;
  maxSizeMB?: number;
  folder?: string;
  disabled?: boolean;
}

export function FileUpload({
  value,
  onChange,
  label = 'Tài liệu / Hình ảnh minh chứng (VietGAP, giấy tờ đất, ảnh chụp nông trại)',
  hint = 'Người dùng có thể tải lên nhiều tập tin minh chứng (ảnh JPG, PNG hoặc tài liệu PDF). Tổng dung lượng tối đa 15MB. Lưu an toàn trên Cloudinary.',
  error,
  accept = 'image/*,application/pdf,.doc,.docx',
  maxSizeMB = 15,
  folder = 'mycropdiary/evidence',
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const fileList = parseEvidenceFiles(value);
  const totalBytes = fileList.reduce((acc, f) => acc + (f.size || 0), 0);

  const openFilePicker = () => {
    if (disabled || isUploading) return;
    if (typeof document === 'undefined') return;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = accept;
    fileInput.multiple = true;
    fileInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        void processFiles(Array.from(files));
      }
    };
    fileInput.click();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void processFiles(Array.from(files));
    }
  };

  const processFiles = async (newFiles: File[]) => {
    setUploadError(null);

    // Kiểm tra tổng dung lượng kết hợp (file cũ + file mới)
    const newFilesBytes = newFiles.reduce((acc, f) => acc + f.size, 0);
    const combinedBytes = totalBytes + newFilesBytes;
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (combinedBytes > maxBytes) {
      setUploadError(
        `Tổng dung lượng các tập tin (${(combinedBytes / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa ${maxSizeMB}MB. Vui lòng giảm bớt hoặc chọn file nhỏ hơn.`
      );
      return;
    }

    try {
      setIsUploading(true);
      const uploadedItems: EvidenceFileItem[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        setUploadStatus(`Đang tải tập tin ${i + 1}/${newFiles.length}: "${file.name}" lên Cloudinary...`);
        const result = await uploadFileToCloudinary(file, folder);
        uploadedItems.push({
          name: file.name,
          url: result.url,
          size: file.size,
          type: file.type,
          publicId: result.publicId,
        });
      }

      const merged = [...fileList, ...uploadedItems];
      onChange(JSON.stringify(merged));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tải tập tin lên Cloudinary thất bại. Vui lòng thử lại.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleRemoveFile = (index: number) => {
    const updated = fileList.filter((_, idx) => idx !== index);
    if (updated.length === 0) {
      onChange('');
    } else {
      onChange(JSON.stringify(updated));
    }
    setUploadError(null);
  };

  return (
    <div className="file-upload-container">
      {label && <span className="file-upload-label">{label}</span>}

      {/* Cloudinary Upload & Drag-and-drop Area */}
      <div
        className={`file-upload-dropzone ${isDragging ? 'is-dragging' : ''} ${isUploading ? 'is-uploading' : ''} ${disabled ? 'is-disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFilePicker}
        role="button"
        tabIndex={0}
      >
        {isUploading ? (
          <div className="file-upload-loading">
            <span className="file-upload-spinner">
              <Icon name="loader" className="spin-icon" />
            </span>
            <p className="file-upload-loading-text">{uploadStatus || 'Đang tải tập tin lên Cloudinary...'}</p>
            <small style={{ color: '#64748b' }}>Vui lòng đợi trong giây lát</small>
          </div>
        ) : (
          <div className="file-upload-prompt">
            <div className="file-upload-cloud-icon">
              <Icon name="cloud" />
            </div>
            <p className="file-upload-prompt-title">
              <strong>Kéo & thả nhiều ảnh / tài liệu vào đây</strong> hoặc <span className="file-upload-browse">chọn từ thiết bị</span>
            </p>
            <p className="file-upload-prompt-sub">
              Hỗ trợ nhiều tập tin (ảnh JPG, PNG, WEBP hoặc file PDF, DOCX).
            </p>
            <span className="file-upload-prompt-limit">
              Lưu trữ Cloudinary • Tổng tối đa {maxSizeMB}MB
            </span>
          </div>
        )}
      </div>

      {/* Danh sách các tập tin đã tải lên */}
      {fileList.length > 0 && (
        <div className="file-upload-list-card">
          <div className="file-upload-list-header">
            <span className="file-upload-list-title">
              <Icon name="check-circle" style={{ color: '#059669', fontSize: '15px' }} />
              Danh sách tài liệu đã tải lên ({fileList.length} tập tin)
            </span>
            <span className="file-upload-list-badge">
              Tổng dung lượng: <strong>{formatFileSize(totalBytes) || '< 1MB'}</strong> / {maxSizeMB}MB
            </span>
          </div>

          <div className="file-upload-items-grid">
            {fileList.map((file, idx) => {
              const isImg =
                /\.(jpe?g|png|webp|gif|svg)$/i.test(file.url) ||
                (file.type && file.type.startsWith('image/')) ||
                /\/image\/upload\//i.test(file.url);

              return (
                <div key={`${file.url}-${idx}`} className="file-upload-item-row">
                  <div className="file-upload-item-main">
                    <span className={`file-upload-item-icon ${isImg ? 'is-img' : 'is-doc'}`}>
                      <Icon name={isImg ? 'eye' : 'file-text'} />
                    </span>
                    <div className="file-upload-item-details">
                      <strong className="file-upload-item-name" title={file.name}>
                        {file.name}
                      </strong>
                      <span className="file-upload-item-size">
                        {formatFileSize(file.size)} • Cloudinary
                      </span>
                    </div>
                  </div>

                  <div className="file-upload-item-actions">
                    <button
                      type="button"
                      className="action-button file-upload-item-view-btn"
                      onClick={() => setPreviewIndex(idx)}
                      title="Xem trực tiếp trên web"
                    >
                      <Icon name="eye" /> Xem trực tiếp
                    </button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="action-button file-preview-open-link"
                      style={{ fontSize: '12.5px', padding: '6px 12px' }}
                      title="Mở liên kết gốc Cloudinary trong tab mới"
                    >
                      <Icon name="external-link" /> Mở link
                    </a>
                    <button
                      type="button"
                      className="icon-button file-upload-item-del-btn"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={disabled || isUploading}
                      title="Xóa tập tin này"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="file-upload-list-footer">
            <button
              type="button"
              className="action-button"
              onClick={openFilePicker}
              disabled={disabled || isUploading}
              style={{ fontSize: '13px' }}
            >
              <Icon name="plus" /> Tải thêm tệp khác
            </button>
          </div>
        </div>
      )}

      {/* Hidden input type="url" for automated tests and programmatic compatibility */}
      <input
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: 'none' }}
      />

      {uploadError && <small className="field-error" style={{ display: 'block', marginTop: '6px' }}>{uploadError}</small>}
      {error && !uploadError && <small className="field-error" style={{ display: 'block', marginTop: '6px' }}>{error}</small>}
      {!error && !uploadError && hint && (
        <small className="field-hint" style={{ display: 'block', marginTop: '6px' }}>
          {hint}
        </small>
      )}

      {/* File Preview Modal (Xem trực tiếp trên web) */}
      {previewIndex !== null && (
        <FilePreviewModal
          files={fileList}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}
