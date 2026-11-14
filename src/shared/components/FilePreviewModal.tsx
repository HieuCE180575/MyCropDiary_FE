import { useState, useEffect } from 'react';
import {
  type EvidenceFileItem,
  formatFileSize,
  getWebPreviewUrl,
  getFileTypeInfo,
} from '../api/fileUploadService';
import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

export interface FilePreviewModalProps {
  files: EvidenceFileItem[];
  initialIndex?: number;
  onClose: () => void;
}

export function FilePreviewModal({
  files,
  initialIndex = 0,
  onClose,
}: FilePreviewModalProps) {
  const { lang } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, files.length - 1))
  );

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < files.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, files.length, onClose]);

  if (!files || files.length === 0) return null;

  const currentFile = files[currentIndex] || files[0];
  const { previewUrl, isConvertedPdf, isImage } = getWebPreviewUrl(currentFile.url);
  const typeInfo = getFileTypeInfo(currentFile);

  return (
    <div
      className="modal-backdrop file-preview-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'en' ? 'Supporting Document Preview' : 'Xem chi tiết tài liệu minh chứng'}
    >
      <div className="file-preview-modal-panel">
        {/* Header */}
        <div className="file-preview-header">
          <div className="file-preview-header-info">
            <span className={`file-preview-icon ${typeInfo.badgeClass}`}>
              <Icon name={typeInfo.iconName} />
            </span>
            <div>
              <h3 className="file-preview-title">{currentFile.name}</h3>
              <span className="file-preview-subtitle">
                {formatFileSize(currentFile.size) || (typeInfo.isPdf ? 'PDF • Cloudinary' : typeInfo.isImage ? 'Image • Cloudinary' : 'Cloudinary Document')} • {lang === 'en' ? `File ${currentIndex + 1} of ${files.length}` : `Tập tin ${currentIndex + 1} / ${files.length}`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={currentFile.url}
              target="_blank"
              rel="noreferrer"
              className="action-button file-preview-open-link"
              title={lang === 'en' ? 'Open original link in new tab' : 'Mở liên kết gốc trong tab mới'}
            >
              <Icon name="external-link" /> {lang === 'en' ? 'Open link' : 'Mở liên kết gốc'}
            </a>
            <button
              type="button"
              className="icon-button file-preview-close-btn"
              onClick={onClose}
              title={lang === 'en' ? 'Close preview' : 'Đóng cửa sổ xem'}
            >
              <Icon name="close" />
            </button>
          </div>
        </div>

        {/* Multi-file tabs selector */}
        {files.length > 1 && (
          <div className="file-preview-tabs">
            {files.map((file, idx) => {
              const itemType = getFileTypeInfo(file);
              return (
                <button
                  key={`${file.url}-${idx}`}
                  type="button"
                  className={`file-preview-tab ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  <Icon name={itemType.iconName} />
                  <span className="file-preview-tab-name">{file.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Preview Body */}
        <div className="file-preview-body">
          {isConvertedPdf && (
            <div className="file-preview-pdf-notice">
              <Icon name="check-circle" />
              <span>
                <strong>{lang === 'en' ? 'PDF Document Preview:' : 'Xem trước tài liệu PDF:'}</strong>{' '}
                {lang === 'en'
                  ? 'First page rendered as high-resolution preview directly on web.'
                  : 'Trang đầu của tài liệu được chuyển đổi hiển thị sắc nét trực tiếp trên web.'}
              </span>
              <a href={currentFile.url} target="_blank" rel="noreferrer" className="file-preview-raw-link">
                {lang === 'en' ? 'Download original PDF' : 'Tải file PDF gốc'}
              </a>
            </div>
          )}

          {isImage ? (
            <div className="file-preview-media-wrapper">
              <img
                src={previewUrl}
                alt={currentFile.name}
                className="file-preview-image"
              />
            </div>
          ) : (
            <div className="file-preview-iframe-wrapper">
              <iframe
                src={currentFile.url}
                title={currentFile.name}
                className="file-preview-iframe"
              />
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="file-preview-footer">
          <div className="file-preview-nav">
            {files.length > 1 && (
              <>
                <button
                  type="button"
                  className="action-button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                >
                  <Icon name="chevron-left" /> {lang === 'en' ? 'Previous file' : 'File trước'}
                </button>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {lang === 'en' ? `${currentIndex + 1} of ${files.length}` : `${currentIndex + 1} trên ${files.length}`}
                </span>
                <button
                  type="button"
                  className="action-button"
                  disabled={currentIndex === files.length - 1}
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                >
                  {lang === 'en' ? 'Next file' : 'File kế tiếp'} <Icon name="chevron-right" />
                </button>
              </>
            )}
          </div>

          <button type="button" className="primary-button" onClick={onClose}>
            {lang === 'en' ? 'Close' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}
