import { useState, type DragEvent } from 'react';
import { uploadFileToCloudinary, type FileUploadResult } from '../api/fileUploadService';
import { Icon } from './Icon';

export interface FileUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
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
  hint = 'Tải lên hình ảnh (JPG, PNG, WEBP) hoặc tài liệu PDF/DOCX (tối đa 15MB) lưu trữ an toàn trên Cloudinary.',
  error,
  accept = 'image/*,application/pdf,.doc,.docx',
  maxSizeMB = 15,
  folder = 'mycropdiary/evidence',
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<FileUploadResult | null>(null);

  const hasValue = Boolean(value && value.trim());
  const isImage = hasValue && (
    /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(value!) ||
    /\/image\/upload\//i.test(value!) ||
    value?.startsWith('data:image/')
  );

  const openFilePicker = () => {
    if (disabled || isUploading) return;
    if (typeof document === 'undefined') return;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = accept;
    fileInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        void processFile(files[0]);
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
      void processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    setUploadError(null);

    // Kiểm tra dung lượng file
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`Dung lượng tập tin (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn ${maxSizeMB}MB.`);
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadFileToCloudinary(file, folder);
      setUploadedMeta(result);
      onChange(result.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tải lên Cloudinary thất bại. Vui lòng thử lại.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadedMeta(null);
    setUploadError(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="file-upload-container">
      {label && <span style={{ fontSize: '14px', fontWeight: 650, color: '#334155' }}>{label}</span>}

      {/* Cloudinary Upload & Drop Area */}
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
            <p className="file-upload-loading-text">Đang tải tập tin lên Cloudinary...</p>
            <small style={{ color: '#64748b' }}>Vui lòng đợi trong giây lát</small>
          </div>
        ) : (
          <div className="file-upload-prompt">
            <div className="file-upload-cloud-icon">
              <Icon name="cloud" />
            </div>
            <p className="file-upload-prompt-title">
              <strong>Kéo & thả ảnh / tài liệu vào đây</strong> hoặc <span className="file-upload-browse">chọn từ máy tính</span>
            </p>
            <p className="file-upload-prompt-sub">
              Hỗ trợ ảnh chụp thực tế (JPG, PNG, WEBP) hoặc Giấy chứng nhận VietGAP, sổ đất (PDF)
            </p>
            <span className="file-upload-prompt-limit">Lưu trữ đám mây Cloudinary • Tối đa {maxSizeMB}MB</span>
          </div>
        )}
      </div>

      {/* Hiển thị xem trước ảnh hoặc badge tài liệu khi đã có link Cloudinary */}
      {hasValue && (
        <div className="file-upload-preview-card" style={{ marginTop: '10px' }}>
          {isImage ? (
            <div className="file-upload-image-box">
              <img
                src={value!}
                alt="Hình ảnh minh chứng trang trại"
                className="file-upload-thumbnail"
              />
              <div className="file-upload-image-overlay">
                <a
                  href={value!}
                  target="_blank"
                  rel="noreferrer"
                  className="file-upload-action-btn"
                  title="Mở xem ảnh gốc kích thước lớn"
                >
                  <Icon name="expand" /> Xem ảnh lớn
                </a>
              </div>
            </div>
          ) : (
            <div className="file-upload-doc-badge">
              <span className="file-upload-doc-icon">
                <Icon name="file-text" />
              </span>
              <div className="file-upload-doc-info">
                <strong className="file-upload-doc-name">
                  {uploadedMeta?.originalFilename || 'Tài liệu minh chứng trang trại'}
                </strong>
                <span className="file-upload-doc-size">
                  {uploadedMeta?.bytes
                    ? `${formatFileSize(uploadedMeta.bytes)} • Cloudinary`
                    : 'Đã lưu trên Cloudinary'}
                </span>
                <a
                  href={value!}
                  target="_blank"
                  rel="noreferrer"
                  className="file-upload-doc-link"
                >
                  <Icon name="external-link" /> Xem tài liệu đính kèm
                </a>
              </div>
            </div>
          )}

          <div className="file-upload-actions">
            <button
              type="button"
              className="action-button file-upload-btn-secondary"
              onClick={openFilePicker}
              disabled={disabled || isUploading}
            >
              <Icon name="refresh" /> Tải tệp khác
            </button>
            <button
              type="button"
              className="action-button file-upload-btn-danger"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <Icon name="trash" /> Xóa tệp
            </button>
          </div>
        </div>
      )}

      {/* URL input field: always accessible and synchronised with value */}
      <div style={{ marginTop: '10px' }}>
        <input
          type="url"
          value={value ?? ''}
          maxLength={1000}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://res.cloudinary.com/... hoặc dán link tài liệu trực tiếp"
          disabled={disabled || isUploading}
        />
      </div>

      {uploadError && <small className="field-error" style={{ display: 'block', marginTop: '6px' }}>{uploadError}</small>}
      {error && !uploadError && <small className="field-error" style={{ display: 'block', marginTop: '6px' }}>{error}</small>}
      {!error && !uploadError && hint && (
        <small className="field-hint" style={{ display: 'block', marginTop: '6px' }}>
          {hint}
        </small>
      )}
    </div>
  );
}
