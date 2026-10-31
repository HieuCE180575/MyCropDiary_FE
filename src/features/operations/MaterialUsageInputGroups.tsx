import { useState } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { Icon } from '../../shared/components/Icon';

export const MATERIAL_UNITS = [
  'bao',
  'bao (50kg)',
  'bao (25kg)',
  'chai',
  'chai (1L)',
  'chai (500ml)',
  'can',
  'can (5L)',
  'can (10L)',
  'tấn',
  'tạ',
  'thùng',
  'kg',
  'L',
  'gói',
  'lon',
  'g',
  'mL',
  'khay',
  'cây',
  'hạt',
  'viên',
  'm³',
];

export function getMaterialUnitOptions(currentUnit: string, lang: 'en' | 'vi' = 'en') {
  const enMap: Record<string, string> = {
    'bao (50kg)': 'Bag (50kg - Fertilizer standard)',
    'bao (25kg)': 'Bag (25kg)',
    'bao': 'Bag (Farm standard)',
    'tấn': 'Ton (1,000 kg)',
    'tạ': 'Quintal (100 kg)',
    'kg': 'Kilogram (kg)',
    'g': 'Gram (g)',
    'chai (1L)': '1L Bottle (Pesticide / Nutrition)',
    'chai (500ml)': '500ml Bottle',
    'chai': 'Bottle (Pesticide / Nutrition)',
    'can (5L)': '5L Jug (Biological preparation)',
    'can (10L)': '10L Jug',
    'can': 'Jug (Large preparation / nutrition)',
    'thùng': 'Box / Carton',
    'gói': 'Packet (Seed / Microorganism)',
    'lon': 'Can',
    'L': 'Liter (L)',
    'mL': 'Milliliter (mL)',
    'khay': 'Seedling tray',
    'cây': 'Plant / Sapling',
    'hạt': 'Seed',
    'viên': 'Pellet',
    'm³': 'Cubic meter (m³)',
  };
  const labelMap: Record<string, string> = {
    'bao (50kg)': 'Bao (50kg - Chuẩn phân bón)',
    'bao (25kg)': 'Bao (25kg)',
    'bao': 'Bao (Chuẩn trang trại)',
    'tấn': 'Tấn (1.000 kg)',
    'tạ': 'Tạ (100 kg)',
    'kg': 'Kilogram (kg)',
    'g': 'Gram (g)',
    'chai (1L)': 'Chai 1 Lít (Thuốc BVTV/Dinh dưỡng)',
    'chai (500ml)': 'Chai 500ml',
    'chai': 'Chai (Thuốc BVTV / Dinh dưỡng)',
    'can (5L)': 'Can 5 Lít (Chế phẩm sinh học)',
    'can (10L)': 'Can 10 Lít',
    'can': 'Can (Chế phẩm / Dinh dưỡng lớn)',
    'thùng': 'Thùng đóng gói',
    'gói': 'Gói (Hạt giống/Vi sinh)',
    'lon': 'Lon',
    'L': 'Lít (L)',
    'mL': 'Mililit (mL)',
    'khay': 'Khay giống',
    'cây': 'Cây con',
    'hạt': 'Hạt giống',
    'viên': 'Viên nén',
    'm³': 'Mét khối (m³)',
  };

  const activeMap = lang === 'en' ? enMap : labelMap;
  const options = MATERIAL_UNITS.map(unit => ({
    value: unit === 'L' && currentUnit === 'lít' ? currentUnit : unit,
    label: activeMap[unit] || unit,
  }));
  if (currentUnit && !options.some(option => option.value === currentUnit)) {
    options.unshift({ value: currentUnit, label: activeMap[currentUnit] || currentUnit });
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
  if (u.includes('bao')) {
    if (type.includes('hữu cơ') || type.includes('sinh học')) return 'Dạng hữu cơ vi sinh';
    if (type.includes('hòa tan') || type.includes('bột')) return 'Dạng bột';
    return 'Dạng hạt';
  }
  if (type.includes('lỏng') || u === 'l' || u === 'lít' || u === 'ml' || u.includes('can')) {
    return 'Dạng lỏng / dung dịch';
  }
  if (type.includes('bvtv') || u.includes('chai')) {
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

export const DOSAGE_UNITS = [
  'bao/ha',
  'bao/sào',
  'kg/ha',
  'kg/1000m²',
  'tấn/ha',
  'chai/ha',
  'can/ha',
  'chai/phuy (200L)',
  'lít/ha',
  'ml/bình (20L)',
  'ml/lít',
  'kg/gốc',
  'g/gốc',
  'g/m²',
  'ml/bình',
  'g/bình',
  '%',
];
function readDosage(value: string) {
  // Preserve legacy free text; only split a recognized numeric dose and suffix.
  const match = value.trim().match(/^(\d+(?:[.,]\d*)?|[.,]\d*)\s*(.+)$/u);
  const unit = match && DOSAGE_UNITS.find(option => option === match[2].replace(/\s/g, ''));
  return unit && match ? { amount: match[1], unit } : { amount: value, unit: 'custom' };
}

export function DosageInput({
  value,
  onChange,
  materialType = '',
  materialUnit = '',
}: {
  value: string;
  onChange: (value: string) => void;
  materialType?: string;
  materialUnit?: string;
}) {
  const { lang } = useLanguage();
  const isPesticideOrLiquid =
    materialType.toLowerCase().includes('bvtv') ||
    materialType.toLowerCase().includes('lỏng') ||
    materialType.toLowerCase().includes('chế phẩm') ||
    materialUnit.toLowerCase().includes('chai') ||
    materialUnit.toLowerCase().includes('can') ||
    materialUnit.toLowerCase().includes('l');

  const defaultDoseUnit = isPesticideOrLiquid ? 'chai/ha' : 'bao/ha';
  const [emptyUnit, setEmptyUnit] = useState(defaultDoseUnit);
  const parsed = value ? readDosage(value) : { amount: '', unit: emptyUnit };
  const update = (amount: string, unit: string) => {
    setEmptyUnit(unit);
    onChange(!amount.trim() ? '' : unit === 'custom' ? amount : `${amount} ${unit}`);
  };
  return <div className="mu-compound-input mu-dose-input">
    <span className="mu-input-icon"><Icon name="flask" /></span>
    <input id="usage-dosage" aria-label="Liều lượng" inputMode={parsed.unit === 'custom' ? 'text' : 'decimal'} maxLength={parsed.unit === 'custom' ? 100 : 99 - parsed.unit.length}
      placeholder={parsed.unit === 'custom' ? (lang === 'en' ? 'Enter dosage' : 'Nhập liều lượng') : (lang === 'en' ? 'e.g. 50' : 'Ví dụ: 50')} value={parsed.amount} onChange={event => update(event.target.value, parsed.unit)} />
    <select aria-label="Đơn vị liều lượng" value={parsed.unit} onChange={event => update(parsed.amount, event.target.value)}>
      {DOSAGE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
      <option value="custom">{lang === 'en' ? 'Custom input' : 'Nhập tự do'}</option>
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
