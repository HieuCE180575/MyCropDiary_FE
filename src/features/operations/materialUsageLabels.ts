const TYPES: [string[], string, string][] = [
  [['organic', 'organic fertilizer'], 'Phân bón hữu cơ', 'Organic Fertilizer'],
  [['soluble fertilizer', 'water-soluble fertilizer'], 'Phân bón hòa tan', 'Soluble Fertilizer'],
  [['liquid nutrient', 'liquid nutrition'], 'Dinh dưỡng lỏng', 'Liquid Nutrient'],
  [['biological preparation', 'bio preparation'], 'Chế phẩm sinh học', 'Biological Preparation'],
  [['biological pest control', 'biopesticide'], 'Thuốc BVTV sinh học', 'Biological Pest Control'],
  [['biological fungicide'], 'Thuốc trừ nấm sinh học', 'Biological Fungicide'],
  [['packaging & storage'], 'Bao bì và bảo quản', 'Packaging & Storage'],
  [['irrigation equipment'], 'Thiết bị tưới', 'Irrigation Equipment'],
  [['soil amendment', 'soil conditioner'], 'Chất cải tạo đất', 'Soil Amendment'],
  [['seed', 'seeds'], 'Hạt giống', 'Seeds'],
];
const UNITS: [string[], string, string][] = [
  [['bag', 'bags'], 'bao', 'bag'], [['bottle', 'bottles'], 'chai', 'bottle'],
  [['canister', 'jug', 'jugs'], 'can', 'canister'], [['box', 'boxes', 'carton'], 'thùng', 'box'],
  [['packet', 'pack', 'packets'], 'gói', 'packet'], [['ton', 'tonne'], 'tấn', 'tonne'],
  [['quintal'], 'tạ', 'quintal'], [['tray'], 'khay', 'tray'], [['plant', 'plants'], 'cây', 'plant'],
  [['seed', 'seeds'], 'hạt', 'seed'], [['pellet'], 'viên', 'pellet'],
  [['piece', 'pieces'], 'cái', 'piece'],
  [['liter', 'litre', 'l'], 'lít', 'L'], [['milliliter', 'millilitre'], 'mL', 'mL'],
];

function label(value: string, lang: 'en' | 'vi', entries: typeof TYPES) {
  const key = value.trim().toLowerCase();
  const entry = entries.find(([aliases, vi, en]) => [vi.toLowerCase(), en.toLowerCase(), ...aliases].includes(key));
  return entry ? entry[lang === 'vi' ? 1 : 2] : value;
}
export const materialTypeLabel = (value: string, lang: 'en' | 'vi') => label(value, lang, TYPES);
export const materialUnitLabel = (value: string, lang: 'en' | 'vi') => {
  const match = value.match(/^([^()]+?)(\s*\(.*\))?$/);
  return match ? label(match[1].trim(), lang, UNITS) + (match[2] ?? '') : value;
};
