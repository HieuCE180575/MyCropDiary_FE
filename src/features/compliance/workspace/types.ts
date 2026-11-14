export interface AuditCategoryMeta {
  code: string;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  iconName: string;
}

export const AUDIT_CATEGORIES: AuditCategoryMeta[] = [
  {
    code: 'RECORDS_AND_TRAINING',
    nameVi: 'Hồ sơ & Đào tạo',
    nameEn: 'Records & Training',
    descVi: 'Quản lý hồ sơ pháp lý, tập huấn VietGAP và chứng nhận an toàn thực phẩm.',
    descEn: 'Management of legal dossiers, VietGAP training, and food safety certifications.',
    iconName: 'book',
  },
  {
    code: 'INFRASTRUCTURE_EQUIPMENT',
    nameVi: 'Cơ sở vật chất & Thiết bị',
    nameEn: 'Infrastructure & Equipment',
    descVi: 'Quy chuẩn nhà lưới, khu sơ chế, kho chứa và bảo dưỡng trang thiết bị máy móc.',
    descEn: 'Standards for greenhouses, packing houses, storage facilities, and machinery maintenance.',
    iconName: 'building',
  },
  {
    code: 'INPUTS_AND_TESTING',
    nameVi: 'Vật tư đầu vào (Đất, Nước)',
    nameEn: 'Inputs (Soil, Water)',
    descVi: 'Đánh giá nguy cơ ô nhiễm, kết quả phân tích kiểm nghiệm mẫu đất và nước tưới.',
    descEn: 'Contamination risk assessments and laboratory test records for soil and irrigation water.',
    iconName: 'drop',
  },
  {
    code: 'FERTILIZER_PESTICIDE_MANAGEMENT',
    nameVi: 'Phân bón & Thuốc BVTV',
    nameEn: 'Fertilizers & Pesticides',
    descVi: 'Danh mục được phép sử dụng, kho lưu trữ, nhật ký bón phân và thời gian cách ly (PHI).',
    descEn: 'Permitted chemical registers, chemical storage, fertilization logs, and pre-harvest intervals (PHI).',
    iconName: 'flask',
  },
  {
    code: 'HARVEST_STORAGE_TRANSPORT',
    nameVi: 'Thu hoạch & Bảo quản',
    nameEn: 'Harvest & Storage',
    descVi: 'Quy trình vệ sinh dụng cụ thu hái, bảo quản nhiệt độ và phương tiện vận chuyển.',
    descEn: 'Sanitary procedures for harvesting tools, temperature storage, and produce transport.',
    iconName: 'box',
  },
  {
    code: 'TRACEABILITY_PRODUCT',
    nameVi: 'Truy xuất nguồn gốc',
    nameEn: 'Traceability',
    descVi: 'Ghi mã vùng trồng, mã lô sản phẩm, nhãn mác và quy trình thu hồi khi có sự cố.',
    descEn: 'Plot coding, product batch codes, labeling, and incident recall procedures.',
    iconName: 'target',
  },
  {
    code: 'LABOR_SAFETY_ENVIRONMENT',
    nameVi: 'An toàn lao động & Môi trường',
    nameEn: 'Labor Safety & Environment',
    descVi: 'Trang bị bảo hộ lao động, sơ cấp cứu và xử lý vỏ bao gói thuốc bảo vệ thực vật.',
    descEn: 'PPE provisions, emergency first aid, and safe disposal of pesticide containers.',
    iconName: 'shield',
  },
];

export function getCategoryMeta(categoryCode?: string | null): AuditCategoryMeta | undefined {
  if (!categoryCode) return undefined;
  return AUDIT_CATEGORIES.find((c) => c.code === categoryCode);
}

export function getCategoryDisplayName(categoryCode?: string | null, lang: string = 'vi'): string {
  if (!categoryCode) return lang === 'en' ? 'Uncategorized' : 'Chưa phân nhóm';
  const match = AUDIT_CATEGORIES.find((c) => c.code === categoryCode);
  if (match) return lang === 'en' ? match.nameEn : match.nameVi;
  return categoryCode;
}

export function getCategoryIconName(categoryCode?: string | null): string {
  const match = AUDIT_CATEGORIES.find((c) => c.code === categoryCode);
  return match?.iconName ?? 'check';
}
