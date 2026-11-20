import { useState, useEffect } from 'react';
import { Modal } from '../../shared/components/Modal';
import { Button } from '../../shared/components/Button';
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
  const [seasonsError, setSeasonsError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

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
    let cancelled = false;
    const load = async () => {
      setLoadingSeasons(true);
      setSeasonsError(null);
      setCropSeasons([]);
      setForm(f => ({ ...f, cropSeasonId: 0 }));
      try {
        const seasons = await fetchCropSeasonsByFarm(farmId, { size: 100 });
        if (cancelled) return;
        setCropSeasons(seasons);
        if (seasons.length > 0) {
          setForm((f) => ({ ...f, cropSeasonId: seasons[0].cropSeasonId }));
        }
      } catch (err) {
        if (!cancelled) setSeasonsError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load crop seasons.' : 'Không tải được danh sách mùa vụ.'));
      } finally {
        if (!cancelled) setLoadingSeasons(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [farmId, loadAttempt]);

  const handleSubmit = async () => {
    if (submitting || loadingSeasons || seasonsError) return;
    if (!cropSeasons.some(season => season.cropSeasonId === form.cropSeasonId)) {
      setError(lang === 'en' ? 'Please select a crop season.' : 'Vui lòng chọn vụ mùa.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const run = await initVietGapAuditRunApi(farmId, {
        ...form,
        // The API accepts an Instant; the date input contains only a local calendar date.
        scheduledAt: form.scheduledAt
          ? new Date(`${form.scheduledAt}T00:00:00`).toISOString()
          : null,
      });
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
    <Modal open structured onClose={() => { if (!submitting) onClose(); }}
      title={lang === 'en' ? 'Initialize VietGAP Audit Run' : 'Khởi tạo đợt tự đánh giá VietGAP'}>
      <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 13 }}>
          {lang === 'en' ? '33-criteria TCVN 11892-1:2017 internal checklist' : 'Bảng kiểm nội bộ 33 tiêu chí TCVN 11892-1:2017'}
        </p>
        <div className="structured-field-card">
          <div className="structured-field-header">
            <label htmlFor="audit-season" className="structured-field-label">
              {lang === 'en' ? 'Crop season' : 'Mùa vụ'} <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
          </div>
          <select id="audit-season" className="ui-select" required value={form.cropSeasonId}
            disabled={loadingSeasons || submitting || Boolean(seasonsError)}
            onChange={(event) => setForm((f) => ({ ...f, cropSeasonId: Number(event.target.value) }))}>
            <option value={0}>{loadingSeasons ? (lang === 'en' ? 'Loading seasons...' : 'Đang tải danh sách mùa vụ...') : (lang === 'en' ? '-- Select crop season --' : '-- Chọn mùa vụ --')}</option>
            {cropSeasons.map((season) => (
              <option key={season.cropSeasonId} value={season.cropSeasonId}>
                {season.seasonName} ({season.cropCategoryName ?? '—'})
              </option>
            ))}
          </select>
          {seasonsError && <div role="alert" className="form-error-banner" style={{ marginTop: 12 }}>
            <p>{seasonsError}</p>
            <Button type="button" variant="secondary" onClick={() => setLoadAttempt(value => value + 1)}>{lang === 'en' ? 'Retry' : 'Thử lại'}</Button>
          </div>}
          {!loadingSeasons && !seasonsError && cropSeasons.length === 0 && <p role="status">{lang === 'en' ? 'Create a crop season before starting an audit.' : 'Hãy tạo mùa vụ trước khi khởi tạo đợt đánh giá.'}</p>}
        </div>
        <div className="structured-field-card">
          <div className="structured-field-header">
            <label htmlFor="audit-scheduled" className="structured-field-label">{lang === 'en' ? 'Scheduled date' : 'Ngày dự kiến thực hiện'}</label>
            <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
          </div>
          <input id="audit-scheduled" className="ui-input" type="date" disabled={submitting}
            value={form.scheduledAt ?? ''}
            onChange={(event) => setForm((f) => ({ ...f, scheduledAt: event.target.value || null }))} />
        </div>
        <div className="structured-field-card">
          <div className="structured-field-header">
            <label htmlFor="audit-notes" className="structured-field-label">{lang === 'en' ? 'Notes' : 'Ghi chú'}</label>
            <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
          </div>
          <textarea id="audit-notes" className="ui-textarea" rows={3} disabled={submitting}
            value={form.notes ?? ''}
            onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value || null }))}
            placeholder={lang === 'en' ? 'Enter notes about this audit run...' : 'Nhập ghi chú về đợt tự đánh giá này...'} />
        </div>
        {error && <p role="alert" className="form-error-banner">{error}</p>}
        <div style={{ background: 'var(--color-page)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          {lang === 'en'
            ? 'Some criteria are checked automatically using the farm’s existing records.'
            : 'Một số tiêu chí sẽ được kiểm tra tự động từ hồ sơ hiện có của trang trại.'}
        </div>
        <div className="confirm-actions" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          <Button className={'ui-cancel-button'} variant="secondary" onClick={onClose} disabled={submitting}>{lang === 'en' ? 'Cancel' : 'Hủy'}</Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={loadingSeasons || !form.cropSeasonId}>
            {submitting ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Start audit run' : 'Khởi tạo đợt đánh giá')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
