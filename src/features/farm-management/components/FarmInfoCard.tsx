import { StatusBadge } from '../../../shared/components/StatusBadge';
import { FARM_STATUS_LABEL, FARM_STATUS_TONE } from '../constants';
import type { Farm } from '../types';

interface FarmInfoCardProps {
  farm: Farm;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function FarmInfoCard({ farm }: FarmInfoCardProps) {
  return (
    <div className="panel farm-info-card">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{farm.farmCode}</span>
          <h2>{farm.farmName}</h2>
        </div>
        <StatusBadge label={FARM_STATUS_LABEL[farm.status]} tone={FARM_STATUS_TONE[farm.status]} />
      </div>

      <dl className="detail-list">
        <div>
          <dt>Địa chỉ</dt>
          <dd>{farm.address}</dd>
        </div>
        {farm.phoneNumber ? (
          <div>
            <dt>Số điện thoại</dt>
            <dd>{farm.phoneNumber}</dd>
          </div>
        ) : null}
        {farm.description ? (
          <div>
            <dt>Mô tả</dt>
            <dd>{farm.description}</dd>
          </div>
        ) : null}
        <div>
          <dt>Ngày tạo</dt>
          <dd>{formatDateTime(farm.createdAt)}</dd>
        </div>
        {farm.updatedAt ? (
          <div>
            <dt>Cập nhật lần cuối</dt>
            <dd>{formatDateTime(farm.updatedAt)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
