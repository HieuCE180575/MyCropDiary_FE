import { useState } from 'react';
import { Icon } from '../../shared/components/Icon';

export const MATERIAL_UNITS = ['kg', 'g', 'tấn', 'L', 'mL', 'chai', 'gói', 'bao', 'can', 'thùng', 'hạt', 'cây', 'khay', 'viên', 'm³'];

export function getMaterialUnitOptions(currentUnit: string) {
  // Show L while retaining legacy "lít" values to match the material in the API.
  const options = MATERIAL_UNITS.map(unit => ({
    value: unit === 'L' && currentUnit === 'lít' ? currentUnit : unit,
    label: unit,
  }));
  if (currentUnit && !options.some(option => option.value === currentUnit)) {
    options.push({ value: currentUnit, label: currentUnit });
  }
  return options;
}

export const MATERIAL_TYPES = ['Phân bón hữu cơ', 'Phân bón hòa tan', 'Dinh dưỡng lỏng', 'Chế phẩm sinh học', 'Thuốc BVTV sinh học', 'Chất cải tạo đất', 'Hạt giống'];
export const MATERIAL_GROUPS = [
  { name: 'Phân bón', types: MATERIAL_TYPES.slice(0, 2) },
  { name: 'Dinh dưỡng', types: [MATERIAL_TYPES[2]] },
  { name: 'Chế phẩm sinh học', types: [MATERIAL_TYPES[3]] },
  { name: 'Thuốc BVTV', types: [MATERIAL_TYPES[4]] },
  { name: 'Chất cải tạo đất', types: [MATERIAL_TYPES[5]] },
  { name: 'Hạt giống', types: [MATERIAL_TYPES[6]] },
];
export function materialGroupName(type: string) {
  return MATERIAL_GROUPS.find(group => group.types.includes(type))?.name ?? 'Khác';
}

export const MATERIAL_FORMS = [
  'Dạng hạt',
  'Dạng bột',
  'Dạng lỏng / dung dịch',
  'Dạng viên nén',
  'Dạng nhũ dầu',
  'Dạng hữu cơ vi sinh',
  'Hạt / cây giống',
];

export const AREA_UNITS = ['m²', 'sào', 'ha'];

export function defaultMaterialForm(materialType?: string | null, unit?: string | null): string {
  const type = (materialType ?? '').toLocaleLowerCase('vi-VN');
  const u = (unit ?? '').toLocaleLowerCase('vi-VN');
  if (type.includes('lỏng') || u === 'l' || u === 'lít' || u === 'ml' || u === 'can') {
    return 'Dạng lỏng / dung dịch';
  }
  if (type.includes('bvtv') || u === 'chai') {
    return 'Dạng nhũ dầu';
  }
  if (type.includes('hòa tan')) {
    return 'Dạng bột';
  }
  if (type.includes('hữu cơ') || type.includes('sinh học')) {
    return 'Dạng hữu cơ vi sinh';
  }
  if (type.includes('giống') || u === 'hạt' || u === 'cây' || u === 'khay') {
    return 'Hạt / cây giống';
  }
  if (u === 'viên') {
    return 'Dạng viên nén';
  }
  return 'Dạng hạt';
}

const DOSAGE_UNITS = ['g/gốc', 'kg/ha', 'g/m²', 'ml/lít', 'ml/bình', 'g/bình', '%'];
function readDosage(value: string) {
  // Preserve legacy free text; only split a recognized numeric dose and suffix.
  const match = value.trim().match(/^(\d+(?:[.,]\d*)?|[.,]\d*)\s*(.+)$/u);
  const unit = match && DOSAGE_UNITS.find(option => option === match[2].replace(/\s/g, ''));
  return unit && match ? { amount: match[1], unit } : { amount: value, unit: 'custom' };
}

export function DosageInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [emptyUnit, setEmptyUnit] = useState('g/gốc');
  const parsed = value ? readDosage(value) : { amount: '', unit: emptyUnit };
  const update = (amount: string, unit: string) => {
    setEmptyUnit(unit);
    onChange(!amount.trim() ? '' : unit === 'custom' ? amount : `${amount} ${unit}`);
  };
  return <div className="mu-compound-input mu-dose-input">
    <span className="mu-input-icon"><Icon name="flask" /></span>
    <input id="usage-dosage" aria-label="Liều lượng" inputMode={parsed.unit === 'custom' ? 'text' : 'decimal'} maxLength={parsed.unit === 'custom' ? 100 : 99 - parsed.unit.length}
      placeholder={parsed.unit === 'custom' ? 'Nhập liều lượng' : 'Ví dụ: 50'} value={parsed.amount} onChange={event => update(event.target.value, parsed.unit)} />
    <select aria-label="Đơn vị liều lượng" value={parsed.unit} onChange={event => update(parsed.amount, event.target.value)}>
      {DOSAGE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
      <option value="custom">Nhập tự do</option>
    </select>
  </div>;
}

const METHODS = ['Bón gốc', 'Bón lót', 'Bón thúc', 'Phun lá', 'Phun sương', 'Tưới nhỏ giọt'];
export function MethodInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(false);
  const isCustom = custom || Boolean(value && !METHODS.includes(value));
  return <>
    <div className="mu-icon-field"><Icon name="sprout" />
      <select id="usage-method" aria-label="Phương pháp sử dụng" value={isCustom ? 'custom' : value} onChange={event => {
        const nextCustom = event.target.value === 'custom';
        setCustom(nextCustom);
        onChange(nextCustom ? '' : event.target.value);
      }}>
        <option value="">Chọn phương pháp sử dụng</option>
        {METHODS.map(method => <option key={method} value={method}>{method}</option>)}
        <option value="custom">Phương pháp khác...</option>
      </select>
    </div>
    {isCustom && <input aria-label="Phương thức" maxLength={200} placeholder="Nhập phương pháp sử dụng" value={value} onChange={event => onChange(event.target.value)} />}
  </>;
}
