import type { Collection, Field } from './adminTypes';

type Example = { vi: string; en: string };
const common: Record<string, Example> = {
  applicant: { vi: 'Ví dụ: Nguyễn Văn An', en: 'e.g. John Doe' },
  ownerName: { vi: 'Ví dụ: Nguyễn Văn An', en: 'e.g. John Doe' },
  email: { vi: 'Ví dụ: nguyenvanan@gmail.com', en: 'e.g. john.doe@example.com' },
  ownerEmail: { vi: 'Ví dụ: chutrangtrai@gmail.com', en: 'e.g. owner@example.com' },
  ownerPhone: { vi: 'Ví dụ: 0912345678', en: 'e.g. 0912345678' },
  phone: { vi: 'Ví dụ: 0912345678', en: 'e.g. 0912345678' },
  address: { vi: 'Nhập số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố…', en: 'Enter street address, ward, district and province/city…' },
  province: { vi: 'Ví dụ: Đồng Tháp', en: 'e.g. Dong Thap' },
  district: { vi: 'Ví dụ: Huyện Cao Lãnh', en: 'e.g. Cao Lanh District' },
  ward: { vi: 'Ví dụ: Xã Mỹ Hiệp', en: 'e.g. My Hiep Commune' },
  farmName: { vi: 'Ví dụ: Trang trại An Phú', en: 'e.g. Green Valley Farm' },
  zoneName: { vi: 'Ví dụ: Phân khu nhà kính A', en: 'e.g. Greenhouse Zone A' },
  assignedStaff: { vi: 'Ví dụ: Trần Thị Bình', en: 'e.g. Jane Smith' },
  areaValue: { vi: 'Ví dụ: 1500 (theo đơn vị đã chọn)', en: 'e.g. 1500 (in the selected unit)' },
  soilType: { vi: 'Ví dụ: Đất thịt, đất phù sa…', en: 'e.g. Loam, alluvial soil…' },
  cropName: { vi: 'Ví dụ: Xoài cát Hòa Lộc', en: 'e.g. Tropical Mango' },
  zoneBlock: { vi: 'Ví dụ: Phân khu A · Lô A1', en: 'e.g. Zone A · Block A1' },
  checklistProgress: { vi: 'Ví dụ: 95% (19/20 tiêu chí)', en: 'e.g. 95% (19/20 criteria)' },
  phiStatus: { vi: 'Ví dụ: Đã qua thời gian cách ly, an toàn thu hoạch', en: 'e.g. Withholding period completed; safe to harvest' },
  expectedYield: { vi: 'Ví dụ: 4500 kg', en: 'e.g. 4500 kg' },
  traceabilityCode: { vi: 'Ví dụ: LOT-AP-2026-001', en: 'e.g. LOT-GV-2026-001' },
  assessmentNote: { vi: 'Ghi nhận kết quả kiểm tra và các nội dung cần cải thiện…', en: 'Describe inspection results and areas for improvement…' },
  growthDays: { vi: 'Ví dụ: 85–95 ngày', en: 'e.g. 85–95 days' },
  guidance: { vi: 'Mô tả cách kiểm tra, thông tin cần ghi nhận và điều kiện đạt…', en: 'Describe the inspection steps, required records and passing conditions…' },
  clause: { vi: 'Nhập mã điều khoản viện dẫn trong TCVN 11892-1:2017…', en: 'Enter the referenced clause in TCVN 11892-1:2017…' },
  source: { vi: 'Ví dụ: TCVN 11892-1:2017 hoặc đường dẫn tài liệu tham khảo', en: 'e.g. TCVN 11892-1:2017 or a reference document URL' },
  content: { vi: 'Nhập nội dung bài viết, các bước hướng dẫn và lưu ý cho người đọc…', en: 'Enter the article, step-by-step guidance and notes for readers…' },
};

const specific: Partial<Record<Collection, Record<string, Example>>> = {
  registrations: {
    name: { vi: 'Ví dụ: Trang trại An Phú', en: 'e.g. Green Valley Farm' },
    description: { vi: 'Mô tả quy mô, cây trồng chính và hoạt động của trang trại…', en: 'Describe the farm size, main crops and farming activities…' },
  },
  farms: {
    name: { vi: 'Ví dụ: Trang trại An Phú', en: 'e.g. Green Valley Farm' },
    description: { vi: 'Mô tả quy mô, cây trồng chính và định hướng canh tác…', en: 'Describe the farm size, main crops and cultivation approach…' },
  },
  zones: {
    name: { vi: 'Ví dụ: Phân khu nhà kính A', en: 'e.g. Greenhouse Zone A' },
    description: { vi: 'Mô tả vị trí, điều kiện và mục đích sử dụng phân khu…', en: 'Describe the zone location, growing conditions and intended use…' },
  },
  blocks: {
    name: { vi: 'Ví dụ: Lô A1', en: 'e.g. Block A1' },
    description: { vi: 'Mô tả đặc điểm đất, điều kiện canh tác và lưu ý của lô…', en: 'Describe soil characteristics, growing conditions and notes for this plot…' },
  },
  compliance: {
    name: { vi: 'Ví dụ: Mùa vụ xoài xuất khẩu 2026', en: 'e.g. Mango Export Season 2026' },
  },
  crops: {
    code: { vi: 'Ví dụ: XOAI_CAT', en: 'e.g. MANGO_CAT' },
    name: { vi: 'Ví dụ: Xoài cát Hòa Lộc', en: 'e.g. Tropical Mango' },
    description: { vi: 'Mô tả đặc điểm cây trồng và yêu cầu chăm sóc…', en: 'Describe crop characteristics and care requirements…' },
  },
  rules: {
    name: { vi: 'Ví dụ: Ghi chép nhật ký sử dụng phân bón', en: 'e.g. Fertilizer application records' },
  },
  articles: {
    name: { vi: 'Ví dụ: Hướng dẫn ghi nhật ký canh tác theo VietGAP', en: 'e.g. How to keep a VietGAP farming diary' },
  },
};

export function adminFieldPlaceholder(collection: Collection, field: Field): Example | undefined {
  return field.placeholder ?? specific[collection]?.[field.key] ?? common[field.key];
}
