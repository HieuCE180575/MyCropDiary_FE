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

function label(value: string, lang: 'en' | 'vi', entries: typeof TYPES) {
  const key = value.trim().toLowerCase();
  const entry = entries.find(([aliases, vi, en]) => [vi.toLowerCase(), en.toLowerCase(), ...aliases].includes(key));
  return entry ? entry[lang === 'vi' ? 1 : 2] : value;
}
export const materialTypeLabel = (value: string, lang: 'en' | 'vi') => label(value, lang, TYPES);

type UnitEntry = {
  aliases: string[];
  vi: string;
  enSingular: string;
  enPlural: string;
};

const UNITS: UnitEntry[] = [
  { aliases: ['bag', 'bags'], vi: 'bao', enSingular: 'bag', enPlural: 'bags' },
  { aliases: ['bottle', 'bottles'], vi: 'chai', enSingular: 'bottle', enPlural: 'bottles' },
  { aliases: ['canister', 'jug', 'jugs'], vi: 'can', enSingular: 'canister', enPlural: 'canisters' },
  { aliases: ['box', 'boxes', 'carton'], vi: 'thùng', enSingular: 'box', enPlural: 'boxes' },
  { aliases: ['packet', 'pack', 'packets'], vi: 'gói', enSingular: 'packet', enPlural: 'packets' },
  { aliases: ['ton', 'tonne'], vi: 'tấn', enSingular: 'tonne', enPlural: 'tonnes' },
  { aliases: ['quintal'], vi: 'tạ', enSingular: 'quintal', enPlural: 'quintals' },
  { aliases: ['tray'], vi: 'khay', enSingular: 'tray', enPlural: 'trays' },
  { aliases: ['plant', 'plants'], vi: 'cây', enSingular: 'plant', enPlural: 'plants' },
  { aliases: ['seed', 'seeds'], vi: 'hạt', enSingular: 'seed', enPlural: 'seeds' },
  { aliases: ['pellet'], vi: 'viên', enSingular: 'pellet', enPlural: 'pellets' },
  { aliases: ['piece', 'pieces'], vi: 'cái', enSingular: 'piece', enPlural: 'pieces' },
  { aliases: ['liter', 'litre', 'liters', 'litres', 'l'], vi: 'lít', enSingular: 'L', enPlural: 'L' },
  { aliases: ['milliliter', 'millilitre', 'milliliters', 'millilitres'], vi: 'mL', enSingular: 'mL', enPlural: 'mL' },
];

export const materialUnitLabel = (
  value: string,
  lang: 'en' | 'vi',
  quantity?: number
) => {
  const match = value.match(/^([^()]+?)(\s\(.*\))?$/);
  if (!match) return value;

  const key = match[1].trim().toLowerCase();
  const entry = UNITS.find(unit => unit.aliases.includes(key));

  if (!entry) return value;

  const unitLabel =
    lang === 'vi'
      ? entry.vi
      : quantity === undefined || quantity === 1
        ? entry.enSingular
        : entry.enPlural;

  return unitLabel + (match[2] ?? '');
};