import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import type { MaterialUsage } from './MaterialUsagePage';

export function isOrganicMaterial(type?: string) {
  const name = type?.toLowerCase() ?? '';
  return name.includes('hữu cơ') || name.includes('sinh học');
}

export function MaterialUsageHistory({ usages, busy, deletingId, onOpen, onDelete }: {
  usages: MaterialUsage[];
  busy: boolean;
  deletingId: number | null;
  onOpen: (id: number, edit?: boolean) => void;
  onDelete: (id: number, name: string) => void;
}) {
  const { lang } = useLanguage();
  return <>
    <p className="mu-scroll-hint"><Icon name="arrow" /> Cuộn ngang để xem đầy đủ thông tin và thao tác.</p>
    <div className="mu-table-scroll" role="region" aria-label="Bảng lịch sử sử dụng vật tư, có thể cuộn ngang" tabIndex={0}>
      <table className="mu-table">
        <thead><tr>
          <th scope="col">{lang === 'en' ? 'Material' : 'Vật tư'}</th><th scope="col">{lang === 'en' ? 'Date Used' : 'Ngày sử dụng'}</th>
          <th scope="col">{lang === 'en' ? 'Quantity' : 'Số lượng'}</th><th scope="col">{lang === 'en' ? 'Dosage / Method' : 'Liều lượng / Phương pháp'}</th>
          <th scope="col">{lang === 'en' ? 'Safety Interval (PHI)' : 'Cách ly (PHI)'}</th><th scope="col">{lang === 'en' ? 'Recorded By' : 'Người ghi nhận'}</th><th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
        </tr></thead>
        <tbody>{usages.map(usage => <tr key={usage.materialUsageId}>
          <td className="mu-material-cell">
            <span className="mu-record-id">#{usage.materialUsageId}</span>
            <strong>{usage.materialName}</strong>
            <span className={`mu-badge ${isOrganicMaterial(usage.materialType) ? 'mu-badge-green' : 'mu-badge-neutral'}`}>
              {isOrganicMaterial(usage.materialType) && <Icon name="leaf" size={13} />}
              {usage.materialType || (lang === 'en' ? 'Input Material' : 'Vật tư đầu vào')}
            </span>
            {usage.activityName && <span className="mu-secondary">{usage.activityName}</span>}
            {usage.notes && <span className="mu-record-note" title={usage.notes}>{usage.notes}</span>}
          </td>
          <td className="mu-nowrap"><time dateTime={usage.usedAt}>{new Date(usage.usedAt).toLocaleDateString('vi-VN')}</time>
            <span className="mu-secondary">{new Date(usage.usedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </td>
          <td className="mu-quantity">{usage.quantity.toLocaleString('vi-VN')} <span>{usage.unit}</span></td>
          <td className="mu-application"><strong>{usage.dosage || (lang === 'en' ? 'No dosage' : 'Chưa có dữ liệu')}</strong><span className="mu-secondary">{usage.method || (lang === 'en' ? 'No method' : 'Chưa có phương pháp')}</span></td>
          <td>{usage.safetyIntervalDays == null ? <span className="mu-secondary">Chưa có dữ liệu</span> : usage.safetyIntervalDays > 0 ?
            <span className="mu-badge mu-badge-amber"><Icon name="warning" size={14} />{usage.safetyIntervalDays} ngày PHI</span> :
            <span className="mu-badge mu-badge-green"><Icon name="check-circle" size={14} />An toàn (0 ngày)</span>}
          </td>
          <td className="mu-recorder">{usage.recorderFullName || (lang === 'en' ? 'Farm Staff' : 'Thành viên nông trại')}</td>
          <td className="mu-actions-cell" style={{ textAlign: 'right' }}>
            <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="table-icon-btn primary"
                disabled={busy}
                title="Xem chi tiết"
                aria-label={`Chi tiết ${usage.materialName}`}
                onClick={() => onOpen(usage.materialUsageId)}
              >
                <Icon name="eye" size={16} />
                <span className="mu-sr-only">Chi tiết</span>
              </button>
              <button
                type="button"
                className="table-icon-btn edit"
                disabled={busy}
                title="Chỉnh sửa"
                aria-label={`Chỉnh sửa ${usage.materialName}`}
                onClick={() => onOpen(usage.materialUsageId, true)}
              >
                <Icon name="edit" size={16} />
                <span className="mu-sr-only">Chỉnh sửa</span>
              </button>
              <button
                type="button"
                className="table-icon-btn danger mu-delete"
                disabled={busy}
                title="Xóa"
                aria-label={`Xóa ${usage.materialName}`}
                onClick={() => onDelete(usage.materialUsageId, usage.materialName)}
              >
                <Icon name="trash" size={16} />
                <span className="mu-sr-only">{deletingId === usage.materialUsageId ? 'Đang xóa...' : 'Xóa'}</span>
              </button>
            </div>
          </td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
