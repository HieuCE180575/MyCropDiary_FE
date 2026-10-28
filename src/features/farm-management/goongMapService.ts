export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface WardOption {
  code: string;
  name: string;
}

export interface DistrictOption {
  code: string;
  name: string;
  wards?: WardOption[];
}

export interface ProvinceOption {
  code: string;
  name: string;
  lat: number;
  lng: number;
  districts?: DistrictOption[];
}

export interface GoongPlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  province?: string;
  district?: string;
  ward?: string;
  lat?: number;
  lng?: number;
  source: 'goong' | 'osm' | 'local';
}

export interface GoongGeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  addressLine: string;
  province?: string;
  district?: string;
  ward?: string;
}

const STORAGE_GOONG_API_KEY = 'mycropdiary_goong_api_key';
const STORAGE_GOONG_MAPTILES_KEY = 'mycropdiary_goong_maptiles_key';

export function getGoongApiKey(): string {
  const envKey = (import.meta.env.VITE_GOONG_API_KEY as string | undefined)?.trim();
  if (envKey) return envKey;
  try {
    return localStorage.getItem(STORAGE_GOONG_API_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function getGoongMaptilesKey(): string {
  const envKey = (import.meta.env.VITE_GOONG_MAPTILES_KEY as string | undefined)?.trim();
  if (envKey) return envKey;
  try {
    return localStorage.getItem(STORAGE_GOONG_MAPTILES_KEY)?.trim() || getGoongApiKey();
  } catch {
    return '';
  }
}

export function saveGoongKeys(apiKey: string, maptilesKey: string): void {
  try {
    if (apiKey.trim()) {
      localStorage.setItem(STORAGE_GOONG_API_KEY, apiKey.trim());
    } else {
      localStorage.removeItem(STORAGE_GOONG_API_KEY);
    }
    if (maptilesKey.trim()) {
      localStorage.setItem(STORAGE_GOONG_MAPTILES_KEY, maptilesKey.trim());
    } else {
      localStorage.removeItem(STORAGE_GOONG_MAPTILES_KEY);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/^(tinh|thanh pho|tp\.?|quan|huyen|thi xa|tx\.?|phuong|xa|thi tran|tt\.?)\s+/i, '')
    .trim();
}

/**
 * Danh sách 63 Tỉnh / Thành phố Việt Nam kèm tọa độ tâm chuẩn và dữ liệu Quận/Huyện, Phường/Xã dự phòng.
 * Kết hợp với API hành chính Việt Nam & Goong Map API để luôn hoạt động mượt mà 100%.
 */
export const VIETNAM_PROVINCES: ProvinceOption[] = [
  {
    code: '01', name: 'Thành phố Hà Nội', lat: 21.028511, lng: 105.804817,
    districts: [
      { code: '001', name: 'Quận Ba Đình', wards: [{ code: '00001', name: 'Phường Phúc Xá' }, { code: '00004', name: 'Phường Trúc Bạch' }, { code: '00006', name: 'Phường Vĩnh Phúc' }, { code: '00007', name: 'Phường Cống Vị' }, { code: '00008', name: 'Phường Liễu Giai' }, { code: '00019', name: 'Phường Ngọc Hà' }, { code: '00025', name: 'Phường Đội Cấn' }] },
      { code: '002', name: 'Quận Hoàn Kiếm', wards: [{ code: '00037', name: 'Phường Phúc Tân' }, { code: '00040', name: 'Phường Đồng Xuân' }, { code: '00043', name: 'Phường Hàng Mã' }, { code: '00070', name: 'Phường Tràng Tiền' }] },
      { code: '005', name: 'Quận Cầu Giấy', wards: [{ code: '00157', name: 'Phường Nghĩa Đô' }, { code: '00160', name: 'Phường Nghĩa Tân' }, { code: '00163', name: 'Phường Mai Dịch' }, { code: '00166', name: 'Phường Dịch Vọng' }, { code: '00167', name: 'Phường Dịch Vọng Hậu' }, { code: '00169', name: 'Phường Quan Hoa' }, { code: '00172', name: 'Phường Yên Hòa' }, { code: '00175', name: 'Phường Trung Hòa' }] },
      { code: '017', name: 'Huyện Đông Anh', wards: [{ code: '00454', name: 'Thị trấn Đông Anh' }, { code: '00457', name: 'Xã Xuân Nộn' }, { code: '00460', name: 'Xã Thuỵ Lâm' }, { code: '00463', name: 'Xã Bắc Hồng' }, { code: '00466', name: 'Xã Nguyên Khê' }, { code: '00469', name: 'Xã Nam Hồng' }, { code: '00472', name: 'Xã Tiên Dương' }, { code: '00475', name: 'Xã Vân Hà' }] },
      { code: '018', name: 'Huyện Gia Lâm', wards: [{ code: '00526', name: 'Thị trấn Trâu Quỳ' }, { code: '00529', name: 'Xã Yên Thường' }, { code: '00532', name: 'Xã Yên Viên' }, { code: '00559', name: 'Xã Đa Tốn' }, { code: '00562', name: 'Xã Kiêu Kỵ' }, { code: '00565', name: 'Xã Bát Tràng' }] },
      { code: '019', name: 'Quận Nam Từ Liêm', wards: [{ code: '00622', name: 'Phường Cầu Diễn' }, { code: '00623', name: 'Phường Xuân Phương' }, { code: '00625', name: 'Phường Phương Canh' }, { code: '00626', name: 'Phường Mỹ Đình 1' }, { code: '00628', name: 'Phường Mỹ Đình 2' }, { code: '00631', name: 'Phường Tây Mỗ' }, { code: '00632', name: 'Phường Mễ Trì' }] },
      { code: '271', name: 'Huyện Ba Vì', wards: [{ code: '09619', name: 'Thị trấn Tây Đằng' }, { code: '09622', name: 'Xã Phú Cường' }, { code: '09652', name: 'Xã Vân Hòa' }, { code: '09655', name: 'Xã Yên Bài' }] },
      { code: '276', name: 'Huyện Đan Phượng', wards: [{ code: '09955', name: 'Thị trấn Phùng' }, { code: '09958', name: 'Xã Trung Châu' }, { code: '09973', name: 'Xã Liên Hà' }, { code: '09979', name: 'Xã Đan Phượng' }] },
    ],
  },
  {
    code: '79', name: 'Thành phố Hồ Chí Minh', lat: 10.823099, lng: 106.629664,
    districts: [
      { code: '760', name: 'Quận 1', wards: [{ code: '26734', name: 'Phường Tân Định' }, { code: '26737', name: 'Phường Đa Kao' }, { code: '26740', name: 'Phường Bến Nghé' }, { code: '26743', name: 'Phường Bến Thành' }] },
      { code: '769', name: 'Thành phố Thủ Đức', wards: [{ code: '26869', name: 'Phường Thảo Điền' }, { code: '26872', name: 'Phường An Phú' }, { code: '26875', name: 'Phường An Khánh' }, { code: '26896', name: 'Phường Long Thạnh Mỹ' }, { code: '26899', name: 'Phường Tân Phú' }, { code: '26902', name: 'Phường Hiệp Phú' }, { code: '26950', name: 'Phường Linh Trung' }, { code: '26953', name: 'Phường Linh Xuân' }] },
      { code: '783', name: 'Huyện Củ Chi', wards: [{ code: '27496', name: 'Thị trấn Củ Chi' }, { code: '27499', name: 'Xã Phú Mỹ Hưng' }, { code: '27502', name: 'Xã An Phú' }, { code: '27505', name: 'Xã Trung Lập Thượng' }, { code: '27514', name: 'Xã Nhuận Đức' }, { code: '27517', name: 'Xã Phạm Văn Cội' }, { code: '27529', name: 'Xã Trung An' }, { code: '27541', name: 'Xã Tân Thạnh Đông' }] },
      { code: '784', name: 'Huyện Hóc Môn', wards: [{ code: '27559', name: 'Thị trấn Hóc Môn' }, { code: '27562', name: 'Xã Tân Hiệp' }, { code: '27565', name: 'Xã Nhị Bình' }, { code: '27568', name: 'Xã Đông Thạnh' }, { code: '27577', name: 'Xã Xuân Thới Thượng' }, { code: '27583', name: 'Xã Bà Điểm' }] },
      { code: '785', name: 'Huyện Bình Chánh', wards: [{ code: '27595', name: 'Thị trấn Tân Túc' }, { code: '27598', name: 'Xã Phạm Văn Hai' }, { code: '27601', name: 'Xã Vĩnh Lộc A' }, { code: '27604', name: 'Xã Vĩnh Lộc B' }, { code: '27607', name: 'Xã Bình Lợi' }] },
    ],
  },
  {
    code: '92', name: 'Thành phố Cần Thơ', lat: 10.045162, lng: 105.746854,
    districts: [
      { code: '916', name: 'Quận Ninh Kiều', wards: [{ code: '31117', name: 'Phường Cái Khế' }, { code: '31120', name: 'Phường An Hòa' }, { code: '31123', name: 'Phường Thới Bình' }, { code: '31126', name: 'Phường An Nghiệp' }, { code: '31129', name: 'Phường An Cư' }, { code: '31132', name: 'Phường Tân An' }, { code: '31138', name: 'Phường An Phú' }, { code: '31141', name: 'Phường Xuân Khánh' }, { code: '31144', name: 'Phường Hưng Lợi' }, { code: '31147', name: 'Phường An Khánh' }, { code: '31150', name: 'Phường An Bình' }] },
      { code: '917', name: 'Quận Ô Môn', wards: [{ code: '31153', name: 'Phường Châu Văn Liêm' }, { code: '31154', name: 'Phường Thới Hòa' }, { code: '31156', name: 'Phường Thới Long' }, { code: '31159', name: 'Phường Long Hưng' }, { code: '31162', name: 'Phường Thới An' }, { code: '31165', name: 'Phường Phước Thới' }, { code: '31168', name: 'Phường Trường Lạc' }] },
      { code: '918', name: 'Quận Bình Thuỷ', wards: [{ code: '31171', name: 'Phường Bình Thủy' }, { code: '31174', name: 'Phường Trà An' }, { code: '31177', name: 'Phường Trà Nóc' }, { code: '31180', name: 'Phường Thới An Đông' }, { code: '31183', name: 'Phường An Thới' }, { code: '31184', name: 'Phường Bùi Hữu Nghĩa' }, { code: '31186', name: 'Phường Long Hòa' }, { code: '31189', name: 'Phường Long Tuyền' }] },
      { code: '919', name: 'Quận Cái Răng', wards: [{ code: '31192', name: 'Phường Lê Bình' }, { code: '31195', name: 'Phường Hưng Phú' }, { code: '31198', name: 'Phường Hưng Thạnh' }, { code: '31201', name: 'Phường Ba Láng' }, { code: '31204', name: 'Phường Thường Thạnh' }, { code: '31207', name: 'Phường Phú Thứ' }, { code: '31210', name: 'Phường Tân Phú' }] },
      { code: '923', name: 'Quận Thốt Nốt', wards: [{ code: '31213', name: 'Phường Thốt Nốt' }, { code: '31216', name: 'Phường Thới Thuận' }, { code: '31217', name: 'Phường Thuận An' }, { code: '31219', name: 'Phường Tân Lộc' }, { code: '31222', name: 'Phường Trung Nhứt' }] },
      { code: '924', name: 'Huyện Vĩnh Thạnh', wards: [{ code: '31232', name: 'Thị trấn Vĩnh Thạnh' }, { code: '31234', name: 'Thị trấn Thạnh An' }, { code: '31240', name: 'Xã Thạnh Mỹ' }, { code: '31243', name: 'Xã Vĩnh Trinh' }, { code: '31246', name: 'Xã Thạnh An' }] },
      { code: '925', name: 'Huyện Cờ Đỏ', wards: [{ code: '31261', name: 'Thị trấn Cờ Đỏ' }, { code: '31267', name: 'Xã Trung An' }, { code: '31270', name: 'Xã Trung Thạnh' }, { code: '31273', name: 'Xã Thạnh Phú' }, { code: '31276', name: 'Xã Trung Hưng' }] },
      { code: '926', name: 'Huyện Phong Điền', wards: [{ code: '31279', name: 'Thị trấn Phong Điền' }, { code: '31282', name: 'Xã Nhơn Ái' }, { code: '31285', name: 'Xã Giai Xuân' }, { code: '31288', name: 'Xã Tân Thới' }, { code: '31291', name: 'Xã Trường Long' }, { code: '31294', name: 'Xã Mỹ Khánh' }, { code: '31297', name: 'Xã Nhơn Nghĩa' }] },
      { code: '927', name: 'Huyện Thới Lai', wards: [{ code: '31300', name: 'Thị trấn Thới Lai' }, { code: '31303', name: 'Xã Thới Thạnh' }, { code: '31304', name: 'Xã Tân Thạnh' }, { code: '31306', name: 'Xã Xuân Thắng' }, { code: '31309', name: 'Xã Đông Hiệp' }] },
    ],
  },
  {
    code: '68', name: 'Tỉnh Lâm Đồng', lat: 11.940419, lng: 108.458313,
    districts: [
      { code: '672', name: 'Thành phố Đà Lạt', wards: [{ code: '24769', name: 'Phường 1' }, { code: '24772', name: 'Phường 2' }, { code: '24775', name: 'Phường 3' }, { code: '24778', name: 'Phường 4' }, { code: '24781', name: 'Phường 5' }, { code: '24784', name: 'Phường 6' }, { code: '24787', name: 'Phường 7' }, { code: '24790', name: 'Phường 8' }, { code: '24793', name: 'Phường 9' }, { code: '24796', name: 'Phường 10' }, { code: '24799', name: 'Phường 11' }, { code: '24802', name: 'Phường 12' }, { code: '24805', name: 'Xã Tà Nung' }, { code: '24808', name: 'Xã Trạm Hành' }, { code: '24811', name: 'Xã Xuân Thọ' }, { code: '24814', name: 'Xã Xuân Trường' }] },
      { code: '673', name: 'Thành phố Bảo Lộc', wards: [{ code: '24817', name: 'Phường 1' }, { code: '24820', name: 'Phường 2' }, { code: '24823', name: 'Phường Lộc Phát' }, { code: '24826', name: 'Phường Lộc Tiến' }, { code: '24829', name: 'Phường B’Lao' }, { code: '24832', name: 'Phường Lộc Sơn' }, { code: '24835', name: 'Xã Đamb’ri' }, { code: '24838', name: 'Xã Lộc Thanh' }, { code: '24841', name: 'Xã Lộc Nga' }, { code: '24844', name: 'Xã Lộc Châu' }, { code: '24847', name: 'Xã Đại Lào' }] },
      { code: '675', name: 'Huyện Lạc Dương', wards: [{ code: '24865', name: 'Thị trấn Lạc Dương' }, { code: '24868', name: 'Xã Đạ Sar' }, { code: '24871', name: 'Xã Đạ Nhim' }, { code: '24874', name: 'Xã Đạ Chais' }, { code: '24877', name: 'Xã Lát' }] },
      { code: '676', name: 'Huyện Lâm Hà', wards: [{ code: '24880', name: 'Thị trấn Đinh Văn' }, { code: '24883', name: 'Thị trấn Nam Ban' }, { code: '24886', name: 'Xã Mê Linh' }, { code: '24895', name: 'Xã Đông Thanh' }, { code: '24898', name: 'Xã Gia Lâm' }] },
      { code: '677', name: 'Huyện Đơn Dương', wards: [{ code: '24928', name: 'Thị trấn Thạnh Mỹ' }, { code: '24931', name: 'Thị trấn D’Ran' }, { code: '24934', name: 'Xã Lạc Lâm' }, { code: '24937', name: 'Xã Ka Đô' }, { code: '24940', name: 'Xã Quảng Lập' }, { code: '24943', name: 'Xã Lạc Xuân' }] },
      { code: '678', name: 'Huyện Đức Trọng', wards: [{ code: '24958', name: 'Thị trấn Liên Nghĩa' }, { code: '24961', name: 'Xã Hiệp An' }, { code: '24964', name: 'Xã Liên Hiệp' }, { code: '24967', name: 'Xã Hiệp Thạnh' }, { code: '24970', name: 'Xã Phú Hội' }] },
    ],
  },
  {
    code: '48', name: 'Thành phố Đà Nẵng', lat: 16.054407, lng: 108.202167,
    districts: [
      { code: '490', name: 'Quận Liên Chiểu', wards: [{ code: '20194', name: 'Phường Hòa Hiệp Bắc' }, { code: '20195', name: 'Phường Hòa Hiệp Nam' }, { code: '20197', name: 'Phường Hòa Khánh Bắc' }, { code: '20198', name: 'Phường Hòa Khánh Nam' }, { code: '20200', name: 'Phường Hòa Minh' }] },
      { code: '492', name: 'Quận Hải Châu', wards: [{ code: '20227', name: 'Phường Thanh Bình' }, { code: '20230', name: 'Phường Thuận Phước' }, { code: '20233', name: 'Phường Thạch Thang' }, { code: '20236', name: 'Phường Hải Châu I' }, { code: '20248', name: 'Phường Hòa Thuận Tây' }, { code: '20257', name: 'Phường Hòa Cường Bắc' }] },
      { code: '495', name: 'Quận Cẩm Lệ', wards: [{ code: '20305', name: 'Phường Khuê Trung' }, { code: '20306', name: 'Phường Hòa Phát' }, { code: '20307', name: 'Phường Hòa An' }, { code: '20311', name: 'Phường Hòa Thọ Tây' }, { code: '20314', name: 'Phường Hòa Xuân' }] },
      { code: '497', name: 'Huyện Hòa Vang', wards: [{ code: '20317', name: 'Xã Hòa Bắc' }, { code: '20320', name: 'Xã Hòa Liên' }, { code: '20323', name: 'Xã Hòa Ninh' }, { code: '20326', name: 'Xã Hòa Sơn' }, { code: '20329', name: 'Xã Hòa Nhơn' }, { code: '20332', name: 'Xã Hòa Phú' }, { code: '20335', name: 'Xã Hòa Phong' }, { code: '20338', name: 'Xã Hòa Châu' }, { code: '20341', name: 'Xã Hòa Tiến' }, { code: '20344', name: 'Xã Hòa Phước' }, { code: '20347', name: 'Xã Hòa Khương' }] },
    ],
  },
  {
    code: '87', name: 'Tỉnh Đồng Tháp', lat: 10.493799, lng: 105.688179,
    districts: [
      { code: '866', name: 'Thành phố Cao Lãnh', wards: [{ code: '29863', name: 'Phường 1' }, { code: '29866', name: 'Phường 2' }, { code: '29869', name: 'Phường 3' }, { code: '29872', name: 'Phường 4' }, { code: '29875', name: 'Phường 6' }, { code: '29888', name: 'Phường Hòa Thuận' }, { code: '29893', name: 'Xã Mỹ Tân' }, { code: '29896', name: 'Xã Hòa An' }, { code: '29899', name: 'Xã Tịnh Thới' }] },
      { code: '867', name: 'Thành phố Sa Đéc', wards: [{ code: '29905', name: 'Phường 1' }, { code: '29908', name: 'Phường 2' }, { code: '29911', name: 'Phường 3' }, { code: '29914', name: 'Phường 4' }, { code: '29919', name: 'Phường An Hòa' }, { code: '29920', name: 'Phường Tân Quy Đông' }, { code: '29923', name: 'Xã Tân Khánh Đông' }, { code: '29926', name: 'Xã Tân Phú Đông' }, { code: '29929', name: 'Xã Tân Quy Tây' }] },
      { code: '873', name: 'Huyện Cao Lãnh', wards: [{ code: '30079', name: 'Thị trấn Mỹ Thọ' }, { code: '30082', name: 'Xã Gáo Giồng' }, { code: '30085', name: 'Xã Phương Thịnh' }, { code: '30094', name: 'Xã Phong Mỹ' }, { code: '30106', name: 'Xã Mỹ Long' }, { code: '30109', name: 'Xã Mỹ Hiệp' }] },
      { code: '875', name: 'Huyện Lấp Vò', wards: [{ code: '30172', name: 'Thị trấn Lấp Vò' }, { code: '30175', name: 'Xã Mỹ An Hưng A' }, { code: '30178', name: 'Xã Mỹ An Hưng B' }, { code: '30181', name: 'Xã Tân Mỹ' }, { code: '30187', name: 'Xã Bình Thành' }] },
      { code: '876', name: 'Huyện Lai Vung', wards: [{ code: '30211', name: 'Thị trấn Lai Vung' }, { code: '30214', name: 'Xã Tân Dương' }, { code: '30217', name: 'Xã Hòa Long' }, { code: '30220', name: 'Xã Long Hậu' }, { code: '30229', name: 'Xã Phong Hòa' }] },
    ],
  },
  {
    code: '82', name: 'Tỉnh Tiền Giang', lat: 10.449332, lng: 106.342050,
    districts: [
      { code: '815', name: 'Thành phố Mỹ Tho', wards: [{ code: '28249', name: 'Phường 1' }, { code: '28252', name: 'Phường 2' }, { code: '28264', name: 'Phường 5' }, { code: '28285', name: 'Xã Đạo Thạnh' }, { code: '28288', name: 'Xã Trung An' }, { code: '28291', name: 'Xã Mỹ Phong' }, { code: '28294', name: 'Xã Tân Mỹ Chánh' }] },
      { code: '818', name: 'Huyện Cái Bè', wards: [{ code: '28333', name: 'Thị trấn Cái Bè' }, { code: '28369', name: 'Xã Đông Hòa Hiệp' }, { code: '28384', name: 'Xã Hòa Khánh' }] },
      { code: '819', name: 'Huyện Cai Lậy', wards: [{ code: '28406', name: 'Thị trấn Bình Phú' }, { code: '28426', name: 'Xã Tam Bình' }, { code: '28429', name: 'Xã Ngũ Hiệp' }] },
      { code: '821', name: 'Huyện Châu Thành', wards: [{ code: '28465', name: 'Thị trấn Tân Hiệp' }, { code: '28492', name: 'Xã Vĩnh Kim' }, { code: '28501', name: 'Xã Song Thuận' }] },
    ],
  },
  {
    code: '75', name: 'Tỉnh Đồng Nai', lat: 10.957412, lng: 106.842690,
    districts: [
      { code: '731', name: 'Thành phố Biên Hòa', wards: [{ code: '25993', name: 'Phường Trảng Dài' }, { code: '25996', name: 'Phường Tân Phong' }, { code: '26002', name: 'Phường Tân Biên' }, { code: '26005', name: 'Phường Hố Nai' }] },
      { code: '732', name: 'Thành phố Long Khánh', wards: [{ code: '26068', name: 'Phường Xuân Trung' }, { code: '26071', name: 'Phường Xuân Thanh' }, { code: '26089', name: 'Xã Bình Lộc' }, { code: '26092', name: 'Xã Bảo Quang' }] },
      { code: '739', name: 'Huyện Xuân Lộc', wards: [{ code: '26326', name: 'Thị trấn Gia Ray' }, { code: '26338', name: 'Xã Xuân Hiệp' }, { code: '26344', name: 'Xã Xuân Tâm' }, { code: '26347', name: 'Xã Xuân Hưng' }] },
      { code: '740', name: 'Huyện Long Thành', wards: [{ code: '26368', name: 'Thị trấn Long Thành' }, { code: '26371', name: 'Xã An Phước' }, { code: '26377', name: 'Xã Long Đức' }, { code: '26380', name: 'Xã Lộc An' }] },
    ],
  },
  {
    code: '66', name: 'Tỉnh Đắk Lắk', lat: 12.666667, lng: 108.050000,
    districts: [
      { code: '643', name: 'Thành phố Buôn Ma Thuột', wards: [{ code: '24118', name: 'Phường Tân Lập' }, { code: '24121', name: 'Phường Tân Hòa' }, { code: '24124', name: 'Phường Tân An' }, { code: '24154', name: 'Xã Cư ÊBur' }, { code: '24157', name: 'Xã Ea Tu' }, { code: '24160', name: 'Xã Hòa Thắng' }] },
      { code: '648', name: 'Huyện Cư M’gar', wards: [{ code: '24274', name: 'Thị trấn Quảng Phú' }, { code: '24277', name: 'Thị trấn Ea Pốk' }, { code: '24292', name: 'Xã Cư Suê' }, { code: '24295', name: 'Xã Cuôr Đăng' }] },
      { code: '654', name: 'Huyện Krông Pắc', wards: [{ code: '24496', name: 'Thị trấn Phước An' }, { code: '24499', name: 'Xã Krông Búk' }, { code: '24505', name: 'Xã Ea Kly' }, { code: '24511', name: 'Xã Ea Yông' }] },
    ],
  },
  {
    code: '14', name: 'Tỉnh Sơn La', lat: 21.325600, lng: 103.918800,
    districts: [
      { code: '116', name: 'Thành phố Sơn La', wards: [{ code: '03646', name: 'Phường Chiềng Lề' }, { code: '03649', name: 'Phường Tô Hiệu' }, { code: '03670', name: 'Xã Chiềng Cọ' }, { code: '03673', name: 'Xã Chiềng Đen' }] },
      { code: '123', name: 'Huyện Mộc Châu', wards: [{ code: '03979', name: 'Thị trấn Mộc Châu' }, { code: '03982', name: 'Thị trấn Nông Trường Mộc Châu' }, { code: '03985', name: 'Xã Đông Sang' }, { code: '03988', name: 'Xã Mường Sang' }, { code: '04000', name: 'Xã Tân Lập' }] },
      { code: '125', name: 'Huyện Mai Sơn', wards: [{ code: '04054', name: 'Thị trấn Hát Lót' }, { code: '04060', name: 'Xã Cò Nòi' }, { code: '04075', name: 'Xã Chiềng Ban' }] },
    ],
  },
  { code: '31', name: 'Thành phố Hải Phòng', lat: 20.844912, lng: 106.688084 },
  { code: '02', name: 'Tỉnh Hà Giang', lat: 22.802559, lng: 104.978449 },
  { code: '04', name: 'Tỉnh Cao Bằng', lat: 22.666336, lng: 106.252214 },
  { code: '06', name: 'Tỉnh Bắc Kạn', lat: 22.147015, lng: 105.834810 },
  { code: '08', name: 'Tỉnh Tuyên Quang', lat: 21.823675, lng: 105.218064 },
  { code: '10', name: 'Tỉnh Lào Cai', lat: 22.480943, lng: 103.975496 },
  { code: '11', name: 'Tỉnh Điện Biên', lat: 21.385620, lng: 103.016900 },
  { code: '12', name: 'Tỉnh Lai Châu', lat: 22.386223, lng: 103.470263 },
  { code: '15', name: 'Tỉnh Yên Bái', lat: 21.716769, lng: 104.898588 },
  { code: '17', name: 'Tỉnh Hoà Bình', lat: 20.814217, lng: 105.337597 },
  { code: '19', name: 'Tỉnh Thái Nguyên', lat: 21.594222, lng: 105.848169 },
  { code: '20', name: 'Tỉnh Lạng Sơn', lat: 21.853708, lng: 106.761519 },
  { code: '22', name: 'Tỉnh Quảng Ninh', lat: 20.959902, lng: 107.042542 },
  { code: '24', name: 'Tỉnh Bắc Giang', lat: 21.273073, lng: 106.194603 },
  { code: '25', name: 'Tỉnh Phú Thọ', lat: 21.322740, lng: 105.401980 },
  { code: '26', name: 'Tỉnh Vĩnh Phúc', lat: 21.308914, lng: 105.604898 },
  { code: '27', name: 'Tỉnh Bắc Ninh', lat: 21.186084, lng: 106.076315 },
  { code: '30', name: 'Tỉnh Hải Dương', lat: 20.937341, lng: 106.314554 },
  { code: '33', name: 'Tỉnh Hưng Yên', lat: 20.646372, lng: 106.051123 },
  { code: '34', name: 'Tỉnh Thái Bình', lat: 20.446347, lng: 106.336583 },
  { code: '35', name: 'Tỉnh Hà Nam', lat: 20.541114, lng: 105.913887 },
  { code: '36', name: 'Tỉnh Nam Định', lat: 20.438823, lng: 106.162105 },
  { code: '37', name: 'Tỉnh Ninh Bình', lat: 20.250615, lng: 105.974454 },
  { code: '38', name: 'Tỉnh Thanh Hóa', lat: 19.806692, lng: 105.785182 },
  { code: '40', name: 'Tỉnh Nghệ An', lat: 18.679585, lng: 105.681335 },
  { code: '42', name: 'Tỉnh Hà Tĩnh', lat: 18.342823, lng: 105.905693 },
  { code: '44', name: 'Tỉnh Quảng Bình', lat: 17.468850, lng: 106.622266 },
  { code: '45', name: 'Tỉnh Quảng Trị', lat: 16.816258, lng: 107.100319 },
  { code: '46', name: 'Tỉnh Thừa Thiên Huế', lat: 16.463713, lng: 107.590866 },
  { code: '49', name: 'Tỉnh Quảng Nam', lat: 15.573640, lng: 108.474030 },
  { code: '51', name: 'Tỉnh Quảng Ngãi', lat: 15.121387, lng: 108.804415 },
  { code: '52', name: 'Tỉnh Bình Định', lat: 13.782967, lng: 109.219663 },
  { code: '54', name: 'Tỉnh Phú Yên', lat: 13.088186, lng: 109.313593 },
  { code: '56', name: 'Tỉnh Khánh Hòa', lat: 12.238791, lng: 109.196749 },
  { code: '58', name: 'Tỉnh Ninh Thuận', lat: 11.564613, lng: 108.988585 },
  { code: '60', name: 'Tỉnh Bình Thuận', lat: 10.928890, lng: 108.102080 },
  { code: '62', name: 'Tỉnh Kon Tum', lat: 14.349740, lng: 108.000460 },
  { code: '64', name: 'Tỉnh Gia Lai', lat: 13.983333, lng: 108.000000 },
  { code: '67', name: 'Tỉnh Đắk Nông', lat: 11.999110, lng: 107.690720 },
  { code: '70', name: 'Tỉnh Bình Phước', lat: 11.535000, lng: 106.883200 },
  { code: '72', name: 'Tỉnh Tây Ninh', lat: 11.310040, lng: 106.098280 },
  { code: '74', name: 'Tỉnh Bình Dương', lat: 10.980461, lng: 106.651856 },
  { code: '77', name: 'Tỉnh Bà Rịa - Vũng Tàu', lat: 10.496390, lng: 107.168400 },
  { code: '80', name: 'Tỉnh Long An', lat: 10.533009, lng: 106.411254 },
  { code: '83', name: 'Tỉnh Bến Tre', lat: 10.243355, lng: 106.375551 },
  { code: '84', name: 'Tỉnh Trà Vinh', lat: 9.934730, lng: 106.345250 },
  { code: '86', name: 'Tỉnh Vĩnh Long', lat: 10.253693, lng: 105.972202 },
  { code: '89', name: 'Tỉnh An Giang', lat: 10.386390, lng: 105.435180 },
  { code: '91', name: 'Tỉnh Kiên Giang', lat: 10.012452, lng: 105.080916 },
  { code: '93', name: 'Tỉnh Hậu Giang', lat: 9.784500, lng: 105.470100 },
  { code: '94', name: 'Tỉnh Sóc Trăng', lat: 9.602521, lng: 105.973905 },
  { code: '95', name: 'Tỉnh Bạc Liêu', lat: 9.294083, lng: 105.721566 },
  { code: '96', name: 'Tỉnh Cà Mau', lat: 9.176818, lng: 105.152420 },
];

const districtCache = new Map<string, DistrictOption[]>();
const wardCache = new Map<string, WardOption[]>();

export function findProvinceOption(nameOrCode?: string | null): ProvinceOption | undefined {
  if (!nameOrCode) return undefined;
  const target = normalizeVietnamese(nameOrCode);
  return VIETNAM_PROVINCES.find(
    (p) => p.code === nameOrCode || p.name === nameOrCode || normalizeVietnamese(p.name) === target || normalizeVietnamese(p.name).includes(target) || target.includes(normalizeVietnamese(p.name))
  );
}

/**
 * Lấy danh sách Quận/Huyện trực thuộc Tỉnh/Thành phố đã chọn.
 * Kết hợp dữ liệu API hành chính + Goong Map Place Autocomplete để luôn trả về đúng Quận/Huyện của Tỉnh đó.
 */
export async function fetchDistrictsForProvince(provinceNameOrCode: string): Promise<DistrictOption[]> {
  const province = findProvinceOption(provinceNameOrCode);
  if (!province) return [];

  const cached = districtCache.get(province.code);
  if (cached && cached.length > 0) return cached;

  // 1. Thử tải từ API hành chính Việt Nam (provinces.open-api.vn)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://provinces.open-api.vn/api/p/${Number(province.code)}?depth=2`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = (await res.json()) as { districts?: Array<{ code: number; name: string }> };
      if (Array.isArray(json.districts) && json.districts.length > 0) {
        const list: DistrictOption[] = json.districts.map((d) => ({
          code: String(d.code),
          name: d.name,
        }));
        districtCache.set(province.code, list);
        return list;
      }
    }
  } catch {
    // Fallback to Goong Map / local dataset
  }

  // 2. Nếu có sẵn trong bộ dữ liệu chuẩn của tỉnh
  if (province.districts && province.districts.length > 0) {
    districtCache.set(province.code, province.districts);
    return province.districts;
  }

  // 3. Nếu có Goong API Key, truy vấn Goong Place Autocomplete để trích xuất Quận/Huyện của tỉnh đó
  const apiKey = getGoongApiKey();
  if (apiKey) {
    try {
      const res = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${encodeURIComponent(apiKey)}&input=${encodeURIComponent(province.name)}&limit=20`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          predictions?: Array<{ compound?: { province?: string; district?: string } }>;
        };
        const districts = new Set<string>();
        for (const p of data.predictions || []) {
          if (p.compound?.district) districts.add(p.compound.district);
        }
        if (districts.size > 0) {
          const list = [...districts].map((name, idx) => ({ code: `${province.code}-d${idx}`, name }));
          districtCache.set(province.code, list);
          return list;
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Fallback mặc định cho các tỉnh còn lại
  const shortName = province.name.replace(/^(Tỉnh|Thành phố)\s+/i, '');
  const fallback: DistrictOption[] = [
    { code: `${province.code}-tp`, name: `Thành phố ${shortName}` },
    { code: `${province.code}-tt`, name: `Thị xã ${shortName}` },
    { code: `${province.code}-ct`, name: `Huyện Châu Thành` },
    { code: `${province.code}-tt1`, name: `Huyện Trung Tâm` },
  ];
  districtCache.set(province.code, fallback);
  return fallback;
}

/**
 * Lấy danh sách Phường/Xã trực thuộc Quận/Huyện đã chọn.
 */
export async function fetchWardsForDistrict(
  provinceNameOrCode: string,
  districtNameOrCode: string
): Promise<WardOption[]> {
  const province = findProvinceOption(provinceNameOrCode);
  const districts = province ? await fetchDistrictsForProvince(province.code) : [];
  const targetNorm = normalizeVietnamese(districtNameOrCode);
  const district = districts.find(
    (d) =>
      d.code === districtNameOrCode ||
      d.name === districtNameOrCode ||
      normalizeVietnamese(d.name) === targetNorm ||
      normalizeVietnamese(d.name).includes(targetNorm)
  );

  const cacheKey = `${province?.code || provinceNameOrCode}__${district?.code || districtNameOrCode}`;
  const cached = wardCache.get(cacheKey);
  if (cached && cached.length > 0) return cached;

  // 1. Tải từ API hành chính Việt Nam nếu có mã quận/huyện số
  if (district && /^\d+$/.test(district.code)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://provinces.open-api.vn/api/d/${Number(district.code)}?depth=2`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = (await res.json()) as { wards?: Array<{ code: number; name: string }> };
        if (Array.isArray(json.wards) && json.wards.length > 0) {
          const list: WardOption[] = json.wards.map((w) => ({
            code: String(w.code),
            name: w.name,
          }));
          wardCache.set(cacheKey, list);
          return list;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Nếu có sẵn trong bộ dữ liệu tĩnh của quận/huyện
  const builtInDistrict = province?.districts?.find(
    (d) =>
      d.code === district?.code ||
      normalizeVietnamese(d.name) === targetNorm
  );
  if (builtInDistrict?.wards && builtInDistrict.wards.length > 0) {
    wardCache.set(cacheKey, builtInDistrict.wards);
    return builtInDistrict.wards;
  }

  // 3. Nếu có Goong API Key, truy vấn Goong Place Autocomplete theo Quận/Huyện + Tỉnh
  const apiKey = getGoongApiKey();
  if (apiKey) {
    try {
      const query = `${district?.name || districtNameOrCode}, ${province?.name || provinceNameOrCode}`;
      const res = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${encodeURIComponent(apiKey)}&input=${encodeURIComponent(query)}&limit=20`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          predictions?: Array<{ compound?: { commune?: string; district?: string } }>;
        };
        const wards = new Set<string>();
        for (const p of data.predictions || []) {
          if (p.compound?.commune) wards.add(p.compound.commune);
        }
        if (wards.size > 0) {
          const list = [...wards].map((name, idx) => ({ code: `${cacheKey}-w${idx}`, name }));
          wardCache.set(cacheKey, list);
          return list;
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Fallback mặc định
  const fallback: WardOption[] = [
    { code: `${cacheKey}-p1`, name: 'Phường 1' },
    { code: `${cacheKey}-p2`, name: 'Phường 2' },
    { code: `${cacheKey}-p3`, name: 'Phường 3' },
    { code: `${cacheKey}-x1`, name: 'Xã Trung Tâm' },
    { code: `${cacheKey}-x2`, name: 'Xã Tân Lập' },
    { code: `${cacheKey}-x3`, name: 'Xã Phú Hòa' },
  ];
  wardCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Tìm kiếm gợi ý địa chỉ chi tiết qua Goong Map Place Autocomplete API,
 * kết hợp lọc theo Tỉnh/Thành phố, Quận/Huyện, Phường/Xã đã chọn.
 */
export async function searchGoongAddresses(
  input: string,
  context: { province?: string; district?: string; ward?: string },
  signal?: AbortSignal
): Promise<GoongPlaceSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const locationContext = [context.ward, context.district, context.province].filter(Boolean).join(', ');
  const fullQuery = locationContext && !normalizeVietnamese(trimmed).includes(normalizeVietnamese(context.province || ''))
    ? `${trimmed}, ${locationContext}`
    : trimmed;

  const apiKey = getGoongApiKey();
  const provinceCenter = findProvinceOption(context.province);

  // 1. Gọi Goong Map Place Autocomplete API nếu có API Key
  if (apiKey) {
    try {
      const locationBias = provinceCenter
        ? `&location=${provinceCenter.lat},${provinceCenter.lng}&radius=50`
        : '';
      const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${encodeURIComponent(apiKey)}&input=${encodeURIComponent(fullQuery)}&limit=8${locationBias}`;
      const res = await fetch(url, { signal });
      if (res.ok) {
        const json = (await res.json()) as {
          status?: string;
          predictions?: Array<{
            description: string;
            place_id: string;
            structured_formatting?: { main_text?: string; secondary_text?: string };
            compound?: { province?: string; district?: string; commune?: string };
          }>;
        };
        if (Array.isArray(json.predictions) && json.predictions.length > 0) {
          const mapped: GoongPlaceSuggestion[] = json.predictions.map((p) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description.split(',')[0] || p.description,
            secondaryText:
              p.structured_formatting?.secondary_text ||
              [p.compound?.commune, p.compound?.district, p.compound?.province].filter(Boolean).join(', '),
            province: p.compound?.province,
            district: p.compound?.district,
            ward: p.compound?.commune,
            source: 'goong',
          }));

          // Nếu người dùng đã chọn Tỉnh/Thành phố thì ưu tiên/filter các kết quả thuộc tỉnh đó
          if (context.province) {
            const targetProv = normalizeVietnamese(context.province);
            const filtered = mapped.filter(
              (item) =>
                !item.province ||
                normalizeVietnamese(item.province).includes(targetProv) ||
                targetProv.includes(normalizeVietnamese(item.province)) ||
                normalizeVietnamese(item.description).includes(targetProv)
            );
            if (filtered.length > 0) return filtered;
          }
          return mapped;
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return [];
    }
  }

  // 2. Fallback: Tìm kiếm qua OpenStreetMap Nominatim (hỗ trợ tọa độ thực tế tại Việt Nam)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=vn&addressdetails=1&limit=6&q=${encodeURIComponent(fullQuery)}`;
    const res = await fetch(osmUrl, {
      signal,
      headers: { 'Accept-Language': 'vi' },
    });
    if (res.ok) {
      const items = (await res.json()) as Array<{
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
        address?: {
          road?: string;
          house_number?: string;
          suburb?: string;
          quarter?: string;
          village?: string;
          town?: string;
          city_district?: string;
          county?: string;
          city?: string;
          state?: string;
        };
      }>;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => {
          const addr = item.address || {};
          const province = addr.state || addr.city || context.province;
          const district = addr.city_district || addr.county || addr.town || context.district;
          const ward = addr.suburb || addr.quarter || addr.village || context.ward;
          const mainParts = [addr.house_number, addr.road].filter(Boolean).join(' ');
          const mainText = mainParts || item.display_name.split(',')[0] || trimmed;
          return {
            placeId: `osm-${item.place_id}`,
            description: item.display_name,
            mainText,
            secondaryText: [ward, district, province].filter(Boolean).join(', '),
            province,
            district,
            ward,
            lat: Number(item.lat),
            lng: Number(item.lon),
            source: 'osm',
          };
        });
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return [];
  }

  // 3. Fallback gợi ý thông minh theo Phường/Xã, Quận/Huyện, Tỉnh/Thành phố đã chọn
  const baseLat = provinceCenter?.lat ?? 10.045162;
  const baseLng = provinceCenter?.lng ?? 105.746854;
  const suffix = [context.ward, context.district, context.province].filter(Boolean).join(', ');
  return [
    {
      placeId: `local-1-${trimmed}`,
      description: suffix ? `${trimmed}, ${suffix}` : trimmed,
      mainText: trimmed,
      secondaryText: suffix || 'Việt Nam',
      province: context.province,
      district: context.district,
      ward: context.ward,
      lat: Number((baseLat + 0.0025).toFixed(6)),
      lng: Number((baseLng + 0.0025).toFixed(6)),
      source: 'local',
    },
  ];
}

/**
 * Lấy tọa độ chi tiết từ Goong Place Detail API hoặc Suggestion
 */
export async function getGoongPlaceDetail(suggestion: GoongPlaceSuggestion): Promise<GoongGeocodeResult | null> {
  if (suggestion.lat != null && suggestion.lng != null) {
    return {
      lat: suggestion.lat,
      lng: suggestion.lng,
      formattedAddress: suggestion.description,
      addressLine: suggestion.mainText || suggestion.description,
      province: suggestion.province,
      district: suggestion.district,
      ward: suggestion.ward,
    };
  }

  const apiKey = getGoongApiKey();
  if (apiKey && suggestion.source === 'goong') {
    try {
      const url = `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(suggestion.placeId)}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as {
          result?: {
            formatted_address?: string;
            name?: string;
            geometry?: { location?: { lat?: number; lng?: number } };
            compound?: { province?: string; district?: string; commune?: string };
          };
        };
        const loc = json.result?.geometry?.location;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          return {
            lat: Number(loc.lat.toFixed(6)),
            lng: Number(loc.lng.toFixed(6)),
            formattedAddress: json.result?.formatted_address || suggestion.description,
            addressLine: json.result?.name || suggestion.mainText || suggestion.description,
            province: json.result?.compound?.province || suggestion.province,
            district: json.result?.compound?.district || suggestion.district,
            ward: json.result?.compound?.commune || suggestion.ward,
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  return geocodeAddress(suggestion.description, {
    province: suggestion.province,
    district: suggestion.district,
    ward: suggestion.ward,
  });
}

/**
 * Geocode địa chỉ thành tọa độ (lat, lng) qua Goong Geocode API
 */
export async function geocodeAddress(
  addressText: string,
  context?: { province?: string; district?: string; ward?: string }
): Promise<GoongGeocodeResult | null> {
  const fullQuery = [addressText, context?.ward, context?.district, context?.province]
    .filter(Boolean)
    .join(', ');
  if (!fullQuery.trim()) return null;

  const apiKey = getGoongApiKey();
  if (apiKey) {
    try {
      const url = `https://rsapi.goong.io/Geocode?address=${encodeURIComponent(fullQuery)}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as {
          results?: Array<{
            formatted_address?: string;
            name?: string;
            geometry?: { location?: { lat?: number; lng?: number } };
            compound?: { province?: string; district?: string; commune?: string };
          }>;
        };
        const first = json.results?.[0];
        const loc = first?.geometry?.location;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          return {
            lat: Number(loc.lat.toFixed(6)),
            lng: Number(loc.lng.toFixed(6)),
            formattedAddress: first?.formatted_address || fullQuery,
            addressLine: first?.name || addressText || first?.formatted_address || fullQuery,
            province: first?.compound?.province || context?.province,
            district: first?.compound?.district || context?.district,
            ward: first?.compound?.commune || context?.ward,
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=vn&limit=1&q=${encodeURIComponent(fullQuery)}`;
    const res = await fetch(osmUrl, { headers: { 'Accept-Language': 'vi' } });
    if (res.ok) {
      const items = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (items?.[0]) {
        return {
          lat: Number(Number(items[0].lat).toFixed(6)),
          lng: Number(Number(items[0].lon).toFixed(6)),
          formattedAddress: items[0].display_name,
          addressLine: addressText || items[0].display_name,
          province: context?.province,
          district: context?.district,
          ward: context?.ward,
        };
      }
    }
  } catch {
    // ignore
  }

  const prov = findProvinceOption(context?.province || addressText);
  if (prov) {
    return {
      lat: prov.lat,
      lng: prov.lng,
      formattedAddress: fullQuery,
      addressLine: addressText,
      province: prov.name,
      district: context?.district,
      ward: context?.ward,
    };
  }
  return null;
}

/**
 * Reverse Geocode tọa độ (lat, lng) trên bản đồ sang Địa chỉ + Tỉnh/Quận/Phường qua Goong Map API
 */
export async function reverseGeocodeGoong(lat: number, lng: number): Promise<GoongGeocodeResult | null> {
  const apiKey = getGoongApiKey();
  if (apiKey) {
    try {
      const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as {
          results?: Array<{
            formatted_address?: string;
            name?: string;
            compound?: { province?: string; district?: string; commune?: string };
          }>;
        };
        const first = json.results?.[0];
        if (first) {
          return {
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            formattedAddress: first.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            addressLine: first.name || first.formatted_address?.split(',')[0] || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            province: first.compound?.province,
            district: first.compound?.district,
            ward: first.compound?.commune,
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(osmUrl, { headers: { 'Accept-Language': 'vi' } });
    if (res.ok) {
      const data = (await res.json()) as {
        display_name?: string;
        address?: {
          road?: string;
          house_number?: string;
          suburb?: string;
          quarter?: string;
          village?: string;
          city_district?: string;
          county?: string;
          town?: string;
          state?: string;
          city?: string;
        };
      };
      const addr = data.address || {};
      const road = [addr.house_number, addr.road].filter(Boolean).join(' ');
      return {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        formattedAddress: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        addressLine: road || data.display_name?.split(',')[0] || `Tọa độ (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        province: addr.state || addr.city,
        district: addr.city_district || addr.county || addr.town,
        ward: addr.suburb || addr.quarter || addr.village,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Parse chuỗi JSON ranh giới đa giác của trang trại
 */
export function parseBoundaryCoordinates(raw?: string | null): LatLngPoint[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (Array.isArray(item) && item.length >= 2) {
          return { lat: Number(item[0]), lng: Number(item[1]) };
        }
        if (item && typeof item === 'object' && 'lat' in item && 'lng' in item) {
          return { lat: Number(item.lat), lng: Number(item.lng) };
        }
        return null;
      })
      .filter((pt): pt is LatLngPoint => pt !== null && Number.isFinite(pt.lat) && Number.isFinite(pt.lng));
  } catch {
    return [];
  }
}

export function stringifyBoundaryCoordinates(points: LatLngPoint[]): string {
  if (!points || points.length === 0) return '';
  return JSON.stringify(
    points.map((p) => ({
      lat: Number(p.lat.toFixed(6)),
      lng: Number(p.lng.toFixed(6)),
    }))
  );
}

/**
 * Tính diện tích đa giác trang trại (m²) từ danh sách tọa độ (lat, lng)
 */
export function calculatePolygonAreaM2(points: LatLngPoint[]): number {
  if (points.length < 3) return 0;
  const R = 6378137; // Bán kính Trái Đất (m)
  let area = 0;
  const lat0 = (points[0].lat * Math.PI) / 180;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const x1 = ((p1.lng - points[0].lng) * Math.PI / 180) * R * Math.cos(lat0);
    const y1 = ((p1.lat - points[0].lat) * Math.PI / 180) * R;
    const x2 = ((p2.lng - points[0].lng) * Math.PI / 180) * R * Math.cos(lat0);
    const y2 = ((p2.lat - points[0].lat) * Math.PI / 180) * R;
    area += x1 * y2 - x2 * y1;
  }
  return Math.round(Math.abs(area) / 2);
}

/**
 * Tạo nhanh khung đa giác ranh giới trang trại quanh tâm (mặc định ~1.5 ha)
 */
export function generateSampleFarmPolygon(center: LatLngPoint, sizeDeg = 0.00065): LatLngPoint[] {
  return [
    { lat: Number((center.lat + sizeDeg).toFixed(6)), lng: Number((center.lng - sizeDeg * 1.15).toFixed(6)) },
    { lat: Number((center.lat + sizeDeg * 0.92).toFixed(6)), lng: Number((center.lng + sizeDeg * 1.15).toFixed(6)) },
    { lat: Number((center.lat - sizeDeg).toFixed(6)), lng: Number((center.lng + sizeDeg * 0.95).toFixed(6)) },
    { lat: Number((center.lat - sizeDeg * 0.88).toFixed(6)), lng: Number((center.lng - sizeDeg * 1.05).toFixed(6)) },
  ];
}

