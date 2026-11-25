import { useState, useEffect, useMemo, type DragEvent } from 'react';
import {
  uploadFileToCloudinary,
  parseEvidenceFiles,
  formatFileSize,
  getFileTypeInfo,
  type EvidenceFileItem,
} from '../api/fileUploadService';
import { FilePreviewModal } from './FilePreviewModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { Button } from './Button';
import { useLanguage } from '../i18n/LanguageContext';

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
  /** When true, selected files are held locally in pendingFiles and only uploaded when the parent form submits */
  deferred?: boolean;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}

export function FileUpload({
  value,
  onChange,
  label,
  hint,
  error,
  accept = 'image/*,application/pdf,.doc,.docx',
  maxSizeMB = 15,
  folder = 'mycropdiary/evidence',
  disabled = false,
  deferred = false,
  pendingFiles = [],
  onPendingFilesChange,
}: FileUploadProps) {
  const { lang } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'uploaded' | 'pending'; index: number; name: string } | null>(null);

  const fileList = parseEvidenceFiles(value);

  // Create local preview object URLs for staged (deferred) files
  const pendingPreviewItems = useMemo(() => {
    return pendingFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
    }));
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      pendingPreviewItems.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [pendingPreviewItems]);

  const allPreviewFiles: EvidenceFileItem[] = useMemo(
    () => [...fileList, ...pendingPreviewItems],
    [fileList, pendingPreviewItems]
  );

  const uploadedBytes = fileList.reduce((acc, f) => acc + (f.size || 0), 0);
  const pendingBytes = pendingFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalBytes = uploadedBytes + pendingBytes;
  const totalCount = fileList.length + pendingFiles.length;

  const displayLabel = label ?? (lang === 'en'
    ? 'Supporting Farm Documents & Images (VietGAP, land certificate, farm photos)'
    : 'Tài liệu / Hình ảnh minh chứng (VietGAP, giấy tờ đất, ảnh chụp nông trại)');

  const displayHint = hint ?? (lang === 'en'
    ? `Upload multiple evidence files (JPG, PNG images or PDF documents). Max total ${maxSizeMB}MB. Stored securely on Cloudinary.`
    : `Người dùng có thể tải lên nhiều tập tin minh chứng (ảnh JPG, PNG hoặc tài liệu PDF). Tổng dung lượng tối đa ${maxSizeMB}MB. Lưu an toàn trên Cloudinary.`);

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

    const newFilesBytes = newFiles.reduce((acc, f) => acc + f.size, 0);
    const combinedBytes = totalBytes + newFilesBytes;
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (combinedBytes > maxBytes) {
      setUploadError(
        lang === 'en'
          ? `Total file size (${(combinedBytes / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${maxSizeMB}MB. Please reduce or select smaller files.`
          : `Tổng dung lượng các tập tin (${(combinedBytes / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa ${maxSizeMB}MB. Vui lòng giảm bớt hoặc chọn file nhỏ hơn.`
      );
      return;
    }

    // Deferred mode: stage files locally without uploading until form submit
    if (deferred && onPendingFilesChange) {
      onPendingFilesChange([...pendingFiles, ...newFiles]);
      return;
    }

    try {
      setIsUploading(true);
      const uploadedItems: EvidenceFileItem[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        setUploadStatus(
          lang === 'en'
            ? `Uploading file ${i + 1}/${newFiles.length}: "${file.name}" to Cloudinary...`
            : `Đang tải tập tin ${i + 1}/${newFiles.length}: "${file.name}" lên Cloudinary...`
        );
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
      const msg = err instanceof Error
        ? err.message
        : (lang === 'en' ? 'Failed to upload files to Cloudinary. Please try again.' : 'Tải tập tin lên Cloudinary thất bại. Vui lòng thử lại.');
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'uploaded') {
      const updated = fileList.filter((_, idx) => idx !== deleteTarget.index);
      onChange(updated.length === 0 ? '' : JSON.stringify(updated));
    } else if (deleteTarget.kind === 'pending' && onPendingFilesChange) {
      const updated = pendingFiles.filter((_, idx) => idx !== deleteTarget.index);
      onPendingFilesChange(updated);
    }
    setUploadError(null);
    setDeleteTarget(null);
  };

  return (
    <div className="file-upload-container">
      {displayLabel && <span className="file-upload-label">{displayLabel}</span>}

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
            <p className="file-upload-loading-text">
              {uploadStatus || (lang === 'en' ? 'Uploading files to Cloudinary...' : 'Đang tải tập tin lên Cloudinary...')}
            </p>
            <small style={{ color: '#64748b' }}>
              {lang === 'en' ? 'Please wait a moment' : 'Vui lòng đợi trong giây lát'}
            </small>
          </div>
        ) : (
          <div className="file-upload-prompt">
            <div className="file-upload-cloud-icon">
              <Icon name="cloud" />
            </div>
            <p className="file-upload-prompt-title">
              {lang === 'en' ? (
                <><strong>Drag & drop multiple images / documents here</strong> or <span className="file-upload-browse">browse from device</span></>
              ) : (
                <><strong>Kéo & thả nhiều ảnh / tài liệu vào đây</strong> hoặc <span className="file-upload-browse">chọn từ thiết bị</span></>
              )}
            </p>
            <p className="file-upload-prompt-sub">
              {deferred
                ? (lang === 'en'
                    ? 'Files will only be uploaded after you click Submit.'
                    : 'Tệp sẽ chỉ được tải lên sau khi bạn bấm xác nhận gửi.')
                : (lang === 'en'
                    ? 'Supports multiple files (JPG, PNG, WEBP images or PDF, DOCX files).'
                    : 'Hỗ trợ nhiều tập tin (ảnh JPG, PNG, WEBP hoặc file PDF, DOCX).')}
            </p>
            <span className="file-upload-prompt-limit">
              {lang === 'en' ? `CLOUDINARY STORAGE • MAX TOTAL ${maxSizeMB}MB` : `LƯU TRỮ CLOUDINARY • TỔNG TỐI ĐA ${maxSizeMB}MB`}
            </span>
          </div>
        )}
      </div>

      {/* Danh sách các tập tin đã tải lên / chờ tải lên */}
      {totalCount > 0 && (
        <div className="file-upload-list-card">
          <div className="file-upload-list-header">
            <span className="file-upload-list-title">
              <Icon name="check-circle" style={{ color: '#059669', fontSize: '15px' }} />
              {lang === 'en'
                ? `Selected Documents (${totalCount} ${totalCount === 1 ? 'file' : 'files'})`
                : `Danh sách tài liệu (${totalCount} tập tin)`}
            </span>
            <span className="file-upload-list-badge">
              {lang === 'en' ? 'Total size: ' : 'Tổng dung lượng: '}
              <strong>{formatFileSize(totalBytes) || '< 1MB'}</strong> / {maxSizeMB}MB
            </span>
          </div>

          <div className="file-upload-items-grid">
            {fileList.map((file, idx) => {
              const typeInfo = getFileTypeInfo(file);

              return (
                <div key={`uploaded-${file.url}-${idx}`} className="file-upload-item-row">
                  <div className="file-upload-item-main">
                    <span className={`file-upload-item-icon ${typeInfo.badgeClass}`}>
                      <Icon name={typeInfo.iconName} />
                    </span>
                    <div className="file-upload-item-details">
                      <strong className="file-upload-item-name" title={file.name}>
                        {file.name}
                      </strong>
                      <span className="file-upload-item-size">
                        {formatFileSize(file.size) || (typeInfo.isPdf ? 'PDF • Cloudinary' : typeInfo.isImage ? 'Image • Cloudinary' : 'Cloudinary Document')}
                      </span>
                    </div>
                  </div>

                  <div className="file-upload-item-actions">
                    <button
                      type="button"
                      className="table-icon-btn primary"
                      onClick={() => setPreviewIndex(idx)}
                      title={lang === 'en' ? 'Preview on web' : 'Xem trực tiếp trên web'}
                      aria-label={lang === 'en' ? `Preview ${file.name}` : `Xem trực tiếp ${file.name}`}
                    >
                      <Icon name="eye" size={16} />
                    </button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="table-icon-btn assign"
                      title={lang === 'en' ? 'Open original Cloudinary link in new tab' : 'Mở liên kết gốc Cloudinary trong tab mới'}
                      aria-label={lang === 'en' ? `Open link ${file.name}` : `Mở liên kết ${file.name}`}
                    >
                      <Icon name="external-link" size={16} />
                    </a>
                    <button
                      type="button"
                      className="table-icon-btn danger"
                      onClick={() => setDeleteTarget({ kind: 'uploaded', index: idx, name: file.name })}
                      disabled={disabled || isUploading}
                      title={lang === 'en' ? 'Delete this file' : 'Xóa tập tin này'}
                      aria-label={lang === 'en' ? `Delete ${file.name}` : `Xóa ${file.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {pendingPreviewItems.map((file, idx) => {
              const typeInfo = getFileTypeInfo(file);

              return (
                <div key={`pending-${file.name}-${idx}`} className="file-upload-item-row">
                  <div className="file-upload-item-main">
                    <span className={`file-upload-item-icon ${typeInfo.badgeClass}`}>
                      <Icon name={typeInfo.iconName} />
                    </span>
                    <div className="file-upload-item-details">
                      <strong className="file-upload-item-name" title={file.name}>
                        {file.name}
                      </strong>
                      <span className="file-upload-item-size">
                        {formatFileSize(file.size)} • {lang === 'en' ? 'Pending submit' : 'Chờ xác nhận tải lên'}
                      </span>
                    </div>
                  </div>

                  <div className="file-upload-item-actions">
                    <button
                      type="button"
                      className="table-icon-btn primary"
                      onClick={() => setPreviewIndex(fileList.length + idx)}
                      title={lang === 'en' ? 'Preview' : 'Xem trước'}
                      aria-label={lang === 'en' ? `Preview ${file.name}` : `Xem trước ${file.name}`}
                    >
                      <Icon name="eye" size={16} />
                    </button>
                    <button
                      type="button"
                      className="table-icon-btn danger"
                      onClick={() => setDeleteTarget({ kind: 'pending', index: idx, name: file.name })}
                      disabled={disabled || isUploading}
                      title={lang === 'en' ? 'Delete this file' : 'Xóa tập tin này'}
                      aria-label={lang === 'en' ? `Delete ${file.name}` : `Xóa ${file.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="file-upload-list-footer">
            <Button
              type="button"
              variant="primary"
              size="compact"
              onClick={openFilePicker}
              disabled={disabled || isUploading}
            >
              <Icon name="plus" size={16} /> {lang === 'en' ? 'Add more files' : 'Chọn thêm tệp khác'}
            </Button>
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
      {!error && !uploadError && displayHint && (
        <small className="field-hint" style={{ display: 'block', marginTop: '6px' }}>
          {displayHint}
        </small>
      )}

      {/* Confirm Delete File Popup */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={lang === 'en' ? 'Confirm delete file' : 'Xác nhận xóa tập tin'}
        description={
          lang === 'en'
            ? <>Are you sure you want to remove file &quot;<strong>{deleteTarget?.name}</strong>&quot;?</>
            : <>Bạn có chắc chắn muốn xóa tập tin &quot;<strong>{deleteTarget?.name}</strong>&quot; không?</>
        }
        confirmLabel={lang === 'en' ? 'Delete file' : 'Xóa tập tin'}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* In-app Multi-File Preview Modal */}
      {previewIndex !== null && allPreviewFiles.length > 0 && (
        <FilePreviewModal
          files={allPreviewFiles}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}
