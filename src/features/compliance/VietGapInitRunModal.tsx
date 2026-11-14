import { useState, useEffect } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { fetchCropSeasonsByFarm } from '../operations/cropSeasonService';
import type { CropSeasonResp } from '../operations/cropSeasonService';
import { initVietGapAuditRunApi } from './vietgapComplianceService';
import type { ChecklistRunResp, InitVietGapAuditRunPayload } from './vietgapComplianceService';

interface VietGapInitRunModalProps {
  farmId: number;
  onClose: () => void;
  onSuccess: (run: ChecklistRunResp) => void;
}

export function VietGapInitRunModal({ farmId, onClose, onSuccess }: VietGapInitRunModalProps) {
  const { lang } = useLanguage();
  const [cropSeasons, setCropSeasons] = useState<CropSeasonResp[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  const [form, setForm] = useState<InitVietGapAuditRunPayload>({
    cropSeasonId: 0,
    blockId: null,
    assignedToMemberId: null,
    scheduledAt: null,
    notes: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingSeasons(true);
      try {
        const seasons = await fetchCropSeasonsByFarm(farmId, { size: 100 });
        setCropSeasons(seasons);
        if (seasons.length > 0) {
          setForm((f) => ({ ...f, cropSeasonId: seasons[0].cropSeasonId }));
        }
      } catch {
        // Ignore load error; user will select manually
      } finally {
        setLoadingSeasons(false);
      }
    };
    void load();
  }, [farmId]);

  const handleSubmit = async () => {
    if (!form.cropSeasonId) {
      setError(lang === 'en' ? 'Please select a crop season.' : 'Vui lòng chọn vụ mùa.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const run = await initVietGapAuditRunApi(farmId, form);
      onSuccess(run);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'en'
            ? 'An error occurred. Please try again.'
            : 'Đã xảy ra lỗi. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '520px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>
              {lang === 'en' ? 'Initialize VietGAP Audit Run' : 'Khởi tạo đợt tự đánh giá VietGAP'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              {lang === 'en'
                ? '33-criteria TCVN 11892-1:2017 internal checklist'
                : 'Bảng kiểm nội bộ 33 tiêu chí TCVN 11892-1:2017'}
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose} style={{ fontSize: '20px', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Crop Season Select */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              {lang === 'en' ? 'Crop Season *' : 'Vụ mùa *'}
            </label>
            {loadingSeasons ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>
                {lang === 'en' ? 'Loading seasons...' : 'Đang tải danh sách vụ mùa...'}
              </p>
            ) : (
              <select
                value={form.cropSeasonId}
                onChange={(e) => setForm((f) => ({ ...f, cropSeasonId: Number(e.target.value) }))}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                  borderRadius: '8px', fontSize: '14px', background: '#fff', color: '#0f172a',
                }}
              >
                <option value={0}>{lang === 'en' ? '-- Select crop season --' : '-- Chọn vụ mùa --'}</option>
                {cropSeasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>
                    {s.seasonName} ({s.cropCategoryName ?? '—'}) · {s.seasonStatus}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scheduled Date */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              {lang === 'en' ? 'Scheduled date (optional)' : 'Ngày dự kiến thực hiện (không bắt buộc)'}
            </label>
            <input
              type="date"
              value={form.scheduledAt ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value || null }))}
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px', background: '#fff', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
              {lang === 'en' ? 'Notes (optional)' : 'Ghi chú (không bắt buộc)'}
            </label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              rows={3}
              placeholder={
                lang === 'en'
                  ? 'Enter notes about this audit run...'
                  : 'Nhập ghi chú về đợt tự đánh giá này...'
              }
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                padding: '10px 14px', fontSize: '13px', color: '#991b1b',
              }}
            >
              {error}
            </div>
          )}

          {/* Info box */}
          <div
            style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
              padding: '10px 14px', fontSize: '13px', color: '#166534', lineHeight: 1.5,
            }}
          >
            {lang === 'en'
              ? 'The system will create 33 checklist criteria based on VietGAP standards. The auto-check engine will evaluate criteria that can be verified automatically (PHI compliance, soil/water lab tests, training records).'
              : 'Hệ thống sẽ tạo 33 tiêu chí kiểm tra theo chuẩn VietGAP. Bộ máy tự đánh giá sẽ kiểm tra trước các tiêu chí có thể xác minh (thời gian cách ly thuốc BVTV, hồ sơ đất/nước, tập huấn nhân sự).'}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
            {lang === 'en' ? 'Cancel' : 'Hủy'}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !form.cropSeasonId}
          >
            {submitting ? (
              <>{lang === 'en' ? 'Creating...' : 'Đang tạo...'}</>
            ) : (
              <>{lang === 'en' ? 'Start audit run' : 'Khởi tạo đợt đánh giá'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

