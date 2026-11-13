import { StatusBadge } from '../../../shared/components/StatusBadge';
import { FarmGoongMap } from './FarmGoongMap';
import { formatDateTime } from '../../../shared/format/formatters';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

import { FARM_STATUS_LABEL, FARM_STATUS_TONE } from '../constants';
import { parseBoundaryCoordinates } from '../goongMapService';
import type { Farm } from '../types';


interface FarmInfoCardProps {
  farm: Farm;
}


export function FarmInfoCard({ farm }: FarmInfoCardProps) {
  const { lang } = useLanguage();
  const boundaryPoints = parseBoundaryCoordinates(farm.boundaryCoordinates);

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
          <dt>{(lang === 'en' ? "Address" : "Địa chỉ")}</dt>
          <dd>{farm.address}</dd>
        </div>
        {farm.phoneNumber ? (
          <div>
            <dt>{(lang === 'en' ? "Phone number" : "Số điện thoại")}</dt>
            <dd>{farm.phoneNumber}</dd>
          </div>
        ) : null}
        {farm.description ? (
          <div>
            <dt>{(lang === 'en' ? "Description" : "Mô tả")}</dt>
            <dd>{farm.description}</dd>
          </div>
        ) : null}
        <div>
          <dt>{(lang === 'en' ? "Created date" : "Ngày tạo")}</dt>
          <dd>{formatDateTime(farm.createdAt, lang)}</dd>
        </div>
        {farm.updatedAt ? (
          <div>
            <dt>{(lang === 'en' ? "Last updated" : "Cập nhật lần cuối")}</dt>
            <dd>{formatDateTime(farm.updatedAt, lang)}</dd>
          </div>
        ) : null}
      </dl>

      <div style={{ marginTop: '18px' }}>
        <FarmGoongMap
          farmName={farm.farmName}
          address={farm.address}
          latitude={farm.latitude ?? null}
          longitude={farm.longitude ?? null}
          boundary={boundaryPoints}
          editable={false}
          height={340}
        />
      </div>
    </div>
  );
}
