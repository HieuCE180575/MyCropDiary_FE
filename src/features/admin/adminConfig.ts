import type { Language } from '../../shared/i18n/translations';
import { translateMessage } from '../../shared/i18n/translate';
import { formatDate, formatDateTime } from '../../shared/format/formatters';
import type { Collection, CollectionConfig } from './adminTypes';

export const roleLabels = { USER: 'Người dùng', OWNER: 'Chủ trang trại', STAFF: 'Nhân viên kỹ thuật', ADMIN: 'Quản trị viên' };
export const cropGroups = { LEAFY: 'Rau ăn lá', FRUIT: 'Rau ăn quả', ROOT: 'Rau ăn củ', HERB: 'Rau gia vị' };
export const areaUnits = { m2: 'Mét vuông (m²)', ha: 'Hecta (ha)', sao: 'Sào (1.000 m²)' };
export const requirementLabels = { REQUIRED: 'Bắt buộc', RECOMMENDED: 'Khuyến nghị', NOT_APPLICABLE: 'Không áp dụng' };
export const activityLabels = { ALL: 'Tất cả hoạt động', PLANTING: 'Gieo trồng', FERTILIZING: 'Bón phân', SPRAYING: 'Phun thuốc', WATERING: 'Tưới nước', CARE: 'Chăm sóc', HARVESTING: 'Thu hoạch', OTHER: 'Hoạt động khác' };
export const fieldLabels = { ACTIVITY_DATE: 'Ngày thực hiện', RESPONSIBLE_PERSON: 'Người thực hiện', MATERIAL_NAME: 'Tên vật tư', MATERIAL_QUANTITY: 'Lượng vật tư sử dụng', WITHHOLDING_DAYS: 'Thời gian cách ly', HARVEST_QUANTITY: 'Sản lượng thu hoạch' };
export const ratingLabels = { HELPFUL: 'Hữu ích', NOT_HELPFUL: 'Chưa hữu ích' };
export const articleCategories = { VIETGAP: 'Tiêu chuẩn VietGAP', DIARY: 'Ghi chép canh tác', SOIL_WATER: 'Đất và nước', MATERIALS: 'Vật tư nông nghiệp' };
export const feedbackStatuses = { OPEN: 'Mới tiếp nhận', IN_REVIEW: 'Đang xử lý', RESOLVED: 'Đã giải quyết' };

export const adminConfigs: Record<Collection, CollectionConfig> = {
  registrations: {
    title: 'Duyệt đăng ký trang trại',
    description: 'Kiểm tra hồ sơ, thông tin chủ sở hữu, vị trí địa lý và xét duyệt yêu cầu mở trang trại.',
    icon: 'plots',
    singular: 'hồ sơ đăng ký',
    allowEdit: true,
    statuses: { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' },
    listKeys: ["name","applicant","province"],
    columns: [
      { key: 'name', label: 'Trang trại' },
      { key: 'applicant', label: 'Người đăng ký' },
      { key: 'email', label: 'Email liên hệ' },
      { key: 'province', label: 'Tỉnh / thành phố' },
      { key: 'address', label: 'Địa chỉ trang trại' },
    ],
    fields: [
      { key: 'name', label: 'Tên trang trại', required: true, maxLength: 150 },
      { key: 'applicant', label: 'Người đăng ký', required: true, maxLength: 150 },
      { key: 'email', label: 'Email liên hệ', maxLength: 150 },
      { key: 'address', label: 'Địa chỉ trang trại', required: true, maxLength: 255 },
      { key: 'province', label: 'Tỉnh / thành phố', maxLength: 100 },
      { key: 'district', label: 'Quận / huyện', maxLength: 100 },
      { key: 'ward', label: 'Phường / xã', maxLength: 100 },
      { key: 'description', label: 'Mô tả trang trại', type: 'textarea', maxLength: 1000 },
    ],
    details: [
      { key: 'createdAt', label: 'Thời điểm gửi hồ sơ' },
      { key: 'reviewer', label: 'Người xét duyệt' },
      { key: 'reviewedAt', label: 'Thời điểm xét duyệt' },
      { key: 'document', label: 'Tài liệu kèm theo' },
      { key: 'reason', label: 'Lý do từ chối' },
    ],
  },
  farms: {
    title: 'Quản lý trang trại',
    description: 'Tra cứu và chỉnh sửa thông tin trang trại, chủ sở hữu, quy mô phân khu, lô đất và nhân sự phụ trách.',
    icon: 'home',
    singular: 'trang trại',
    createLabel: 'Thêm trang trại',
    allowEdit: true,
    statuses: { ACTIVE: 'Đang hoạt động', INACTIVE: 'Tạm ngưng' },
    listKeys: ["name","ownerName","scaleSummary"],
    columns: [
      { key: 'name', label: 'Tên trang trại' },
      { key: 'code', label: 'Mã trang trại' },
      { key: 'ownerName', label: 'Chủ sở hữu' },
      { key: 'ownerEmail', label: 'Email chủ trại' },
      { key: 'ownerPhone', label: 'Số điện thoại' },
      { key: 'address', label: 'Địa chỉ canh tác' },
      { key: 'scaleSummary', label: 'Quy mô (Khu · Lô · Diện tích)' },
    ],
    fields: [
      { key: 'name', label: 'Tên trang trại', required: true, maxLength: 150 },
      { key: 'ownerName', label: 'Chủ sở hữu trang trại', required: true, maxLength: 150 },
      { key: 'ownerEmail', label: 'Email chủ trang trại', maxLength: 150 },
      { key: 'ownerPhone', label: 'Số điện thoại liên hệ', maxLength: 30 },
      { key: 'address', label: 'Địa chỉ canh tác', required: true, maxLength: 255 },
      { key: 'description', label: 'Mô tả trang trại', type: 'textarea', maxLength: 1000 },
    ],
    details: [
      { key: 'code', label: 'Mã trang trại' },
      { key: 'scaleSummary', label: 'Quy mô canh tác' },
      { key: 'zoneSummary', label: 'Danh sách phân khu' },
      { key: 'staffSummary', label: 'Nhân sự kỹ thuật phụ trách' },
    ],
  },
  zones: {
    title: 'Quản lý phân khu',
    description: 'Xem đầy đủ phân khu thuộc trang trại nào, của chủ sở hữu nào, ai phụ trách, diện tích và danh sách lô đất.',
    icon: 'plots',
    singular: 'phân khu',
    createLabel: 'Thêm phân khu',
    allowEdit: true,
    statuses: { ACTIVE: 'Đang hoạt động', INACTIVE: 'Tạm ngưng' },
    listKeys: ["name","farmName","areaDisplay","blockCount"],
    columns: [
      { key: 'name', label: 'Tên phân khu' },
      { key: 'code', label: 'Mã phân khu' },
      { key: 'farmName', label: 'Thuộc trang trại' },
      { key: 'ownerName', label: 'Chủ sở hữu' },
      { key: 'assignedStaff', label: 'Nhân sự phụ trách' },
      { key: 'areaDisplay', label: 'Diện tích' },
      { key: 'blockCount', label: 'Số lô đất' },
    ],
    fields: [
      { key: 'name', label: 'Tên phân khu', required: true, maxLength: 150 },
      { key: 'farmName', label: 'Thuộc trang trại', required: true, maxLength: 150 },
      { key: 'ownerName', label: 'Chủ sở hữu', required: true, maxLength: 150 },
      { key: 'assignedStaff', label: 'Nhân sự kỹ thuật phụ trách', maxLength: 255 },
      { key: 'areaValue', label: 'Diện tích', required: true, maxLength: 30 },
      { key: 'areaUnit', label: 'Đơn vị diện tích', type: 'select', options: areaUnits, required: true },
      { key: 'description', label: 'Mô tả phân khu', type: 'textarea', maxLength: 1000 },
    ],
    details: [
      { key: 'code', label: 'Mã phân khu' },
      { key: 'farmCode', label: 'Mã trang trại' },
      { key: 'ownerEmail', label: 'Email chủ sở hữu' },
      { key: 'ownerPhone', label: 'Số điện thoại chủ sở hữu' },
      { key: 'areaDisplay', label: 'Tổng diện tích phân khu' },
      { key: 'blockCount', label: 'Tổng số lô đất' },
      { key: 'blocksSummary', label: 'Danh sách lô đất trực thuộc' },
      { key: 'farmAddress', label: 'Địa chỉ trang trại' },
    ],
  },
  blocks: {
    title: 'Quản lý lô đất',
    description: 'Xem đầy đủ lô đất thuộc phân khu nào, trang trại nào, chủ sở hữu là ai, nhân sự phụ trách, diện tích và loại đất.',
    icon: 'leaf',
    singular: 'lô đất',
    createLabel: 'Thêm lô đất',
    allowEdit: true,
    statuses: { ACTIVE: 'Đang hoạt động', INACTIVE: 'Tạm ngưng' },
    listKeys: ["name","zoneName","farmName","areaDisplay"],
    columns: [
      { key: 'name', label: 'Tên lô đất' },
      { key: 'code', label: 'Mã lô đất' },
      { key: 'zoneName', label: 'Thuộc phân khu' },
      { key: 'farmName', label: 'Thuộc trang trại' },
      { key: 'ownerName', label: 'Chủ sở hữu' },
      { key: 'assignedStaff', label: 'Nhân sự phụ trách' },
      { key: 'areaDisplay', label: 'Diện tích' },
      { key: 'soilType', label: 'Loại đất' },
    ],
    fields: [
      { key: 'name', label: 'Tên lô đất', required: true, maxLength: 150 },
      { key: 'zoneName', label: 'Thuộc phân khu', required: true, maxLength: 150 },
      { key: 'farmName', label: 'Thuộc trang trại', required: true, maxLength: 150 },
      { key: 'ownerName', label: 'Chủ sở hữu', maxLength: 150 },
      { key: 'assignedStaff', label: 'Nhân sự kỹ thuật phụ trách', maxLength: 255 },
      { key: 'areaValue', label: 'Diện tích', required: true, maxLength: 30 },
      { key: 'areaUnit', label: 'Đơn vị diện tích', type: 'select', options: areaUnits, required: true },
      { key: 'soilType', label: 'Loại đất / Thổ nhưỡng', maxLength: 150 },
      { key: 'description', label: 'Mô tả lô đất', type: 'textarea', maxLength: 1000 },
    ],
    details: [
      { key: 'code', label: 'Mã lô đất' },
      { key: 'zoneCode', label: 'Mã phân khu' },
      { key: 'farmCode', label: 'Mã trang trại' },
      { key: 'ownerEmail', label: 'Email chủ sở hữu' },
      { key: 'ownerPhone', label: 'Số điện thoại chủ sở hữu' },
      { key: 'areaDisplay', label: 'Tổng diện tích lô đất' },
    ],
  },
  compliance: {
    title: 'Giám sát mùa vụ & VietGAP',
    description: 'Theo dõi mùa vụ canh tác, tỷ lệ tuân thủ bảng kiểm VietGAP (TCVN 11892-1:2017), thời gian cách ly PHI và mã lô truy xuất nguồn gốc toàn hệ thống.',
    icon: 'check',
    singular: 'hồ sơ mùa vụ & VietGAP',
    createLabel: 'Thêm hồ sơ mùa vụ',
    allowEdit: true,
    statuses: { ACTIVE: 'Đang canh tác', HARVESTED: 'Đã thu hoạch', NEEDS_REVIEW: 'Cần rà soát VietGAP', CANCELLED: 'Đã hủy' },
    listKeys: ["name","cropName","farmName","checklistProgress","phiStatus"],
    columns: [
      { key: 'name', label: 'Tên mùa vụ' },
      { key: 'code', label: 'Mã mùa vụ' },
      { key: 'cropName', label: 'Cây trồng' },
      { key: 'farmName', label: 'Thuộc trang trại' },
      { key: 'zoneBlock', label: 'Phân khu & Lô đất' },
      { key: 'ownerName', label: 'Chủ sở hữu' },
      { key: 'checklistProgress', label: 'Đạt chuẩn VietGAP' },
      { key: 'phiStatus', label: 'Cách ly an toàn (PHI)' },
    ],
    fields: [
      { key: 'name', label: 'Tên mùa vụ canh tác', required: true, maxLength: 150 },
      { key: 'cropName', label: 'Giống cây trồng', required: true, maxLength: 150 },
      { key: 'farmName', label: 'Thuộc trang trại', required: true, maxLength: 150 },
      { key: 'zoneBlock', label: 'Phân khu & Lô đất canh tác', required: true, maxLength: 200 },
      { key: 'ownerName', label: 'Chủ sở hữu', maxLength: 150 },
      { key: 'assignedStaff', label: 'Nhân sự kỹ thuật phụ trách', maxLength: 200 },
      { key: 'checklistProgress', label: 'Tỷ lệ đạt bảng kiểm VietGAP', maxLength: 100 },
      { key: 'phiStatus', label: 'Tình trạng cách ly an toàn (PHI)', maxLength: 150 },
      { key: 'expectedYield', label: 'Sản lượng thu hoạch / dự kiến', maxLength: 100 },
      { key: 'traceabilityCode', label: 'Mã lô truy xuất nguồn gốc (QR)', maxLength: 100 },
      { key: 'assessmentNote', label: 'Nhận xét đánh giá nội bộ VietGAP', type: 'textarea', maxLength: 1000 },
    ],
    details: [
      { key: 'code', label: 'Mã mùa vụ' },
      { key: 'ownerEmail', label: 'Email chủ sở hữu' },
      { key: 'ownerPhone', label: 'Số điện thoại chủ sở hữu' },
    ],
  },
  users: {
    title: 'Quản lý tài khoản',
    description: 'Tra cứu thông tin tài khoản, trang trại sở hữu, phân khu phụ trách và kiểm soát trạng thái truy cập hệ thống.',
    icon: 'user',
    singular: 'tài khoản',
    allowEdit: true,
    statuses: { ACTIVE: 'Đang hoạt động', LOCKED: 'Đã khóa' },
    columns: [
      { key: 'name', label: 'Họ và tên' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Số điện thoại' },
      { key: 'role', label: 'Vai trò' },
      { key: 'farmsSummary', label: 'Trang trại tham gia' },
      { key: 'zonesSummary', label: 'Phân khu phụ trách' },
    ],
    fields: [
      { key: 'name', label: 'Họ và tên', required: true, maxLength: 150 },
      { key: 'phone', label: 'Số điện thoại', maxLength: 30 },
      { key: 'role', label: 'Vai trò hệ thống', type: 'select', options: roleLabels, required: true },
    ],
    details: [
      { key: 'email', label: 'Email' },
      { key: 'verified', label: 'Xác thực email' },
      { key: 'farmsSummary', label: 'Trang trại sở hữu / tham gia' },
      { key: 'zonesSummary', label: 'Phân khu đang phụ trách' },
    ],
  },
  crops: {
    title: 'Danh mục cây trồng',
    description: 'Quản lý danh mục cây trồng dùng chung, chu kỳ sinh trưởng chuẩn và duy trì dữ liệu lịch sử.',
    icon: 'leaf',
    singular: 'danh mục cây trồng',
    createLabel: 'Thêm danh mục',
    allowEdit: true,
    statuses: { ACTIVE: 'Đang sử dụng', INACTIVE: 'Ngừng sử dụng' },
    listKeys: ["name","group","growthDays"],
    columns: [
      { key: 'name', label: 'Tên danh mục' },
      { key: 'code', label: 'Mã danh mục' },
      { key: 'group', label: 'Nhóm cây trồng' },
      { key: 'growthDays', label: 'Chu kỳ sinh trưởng' },
      { key: 'description', label: 'Mô tả kỹ thuật' },
    ],
    fields: [
      { key: 'code', label: 'Mã danh mục', required: true, maxLength: 30, help: { vi: 'Dùng chữ in hoa không dấu, chữ số và dấu gạch dưới; ví dụ: RAU_DEN.', en: 'Use uppercase letters, numbers and underscores; for example: RAU_DEN.' } },
      { key: 'name', label: 'Tên danh mục', required: true, maxLength: 150 },
      { key: 'group', label: 'Nhóm cây trồng', type: 'select', options: cropGroups, required: true },
      { key: 'description', label: 'Mô tả', type: 'textarea', maxLength: 1000 },
      { key: 'growthDays', label: 'Chu kỳ sinh trưởng chuẩn', maxLength: 100 },
    ],
  },
  rules: {
    title: 'Quy tắc bảng kiểm',
    description: 'Cấu hình tiêu chí kiểm tra hồ sơ theo tiêu chuẩn TCVN 11892-1:2017 (VietGAP) cho các lần đánh giá tiếp theo.',
    icon: 'check',
    singular: 'quy tắc',
    createLabel: 'Thêm quy tắc',
    allowEdit: true,
    statuses: { ACTIVE: 'Đang áp dụng', INACTIVE: 'Ngừng áp dụng' },
    listKeys: ["name","clause","activity","requirement"],
    columns: [
      { key: 'name', label: 'Tên quy tắc' },
      { key: 'clause', label: 'Điều khoản TCVN' },
      { key: 'field', label: 'Trường kiểm tra' },
      { key: 'activity', label: 'Hoạt động' },
      { key: 'group', label: 'Nhóm cây trồng' },
      { key: 'requirement', label: 'Mức yêu cầu' },
      { key: 'guidance', label: 'Hướng dẫn' },
    ],
    fields: [
      { key: 'name', label: 'Tên quy tắc', required: true, maxLength: 150, full: true },
      { key: 'field', label: 'Trường kiểm tra', type: 'select', options: fieldLabels, required: true },
      { key: 'activity', label: 'Phạm vi hoạt động', type: 'select', options: activityLabels, required: true },
      { key: 'group', label: 'Nhóm cây trồng', type: 'select', options: { ALL: 'Tất cả nhóm cây', ...cropGroups }, required: true },
      { key: 'requirement', label: 'Mức yêu cầu', type: 'select', options: requirementLabels, required: true },
      { key: 'guidance', label: 'Hướng dẫn cho người dùng', type: 'textarea', maxLength: 1000 },
      { key: 'clause', label: 'Điều khoản viện dẫn (TCVN 11892-1:2017)', maxLength: 150, full: true },
    ],
  },
  articles: {
    title: 'Bài viết kiến thức',
    description: 'Biên soạn và duyệt nguồn kiến thức dùng chung cho người dùng và trợ lý AI.',
    icon: 'book',
    singular: 'bài viết',
    createLabel: 'Viết bài mới',
    allowEdit: true,
    statuses: { DRAFT: 'Bản nháp', APPROVED: 'Đã duyệt', ARCHIVED: 'Đã lưu trữ' },
    listKeys: ["name","category","author"],
    columns: [
      { key: 'name', label: 'Tiêu đề' },
      { key: 'category', label: 'Chuyên mục' },
      { key: 'author', label: 'Người biên soạn' },
      { key: 'source', label: 'Nguồn tham khảo' },
    ],
    fields: [
      { key: 'name', label: 'Tiêu đề bài viết', required: true, maxLength: 200, full: true },
      { key: 'category', label: 'Chuyên mục', type: 'select', options: articleCategories, required: true },
      { key: 'source', label: 'Nguồn tham khảo', maxLength: 1000, full: true },
      { key: 'content', label: 'Nội dung bài viết', type: 'textarea', required: true, maxLength: 20000 },
    ],
    details: [{ key: 'author', label: 'Người biên soạn' }],
  },
  feedback: {
    title: 'Phản hồi AI',
    description: 'Đọc phản hồi, xem ngữ cảnh hội thoại và trả lời người gửi.',
    icon: 'message',
    singular: 'phản hồi',
    statuses: feedbackStatuses,
    listKeys: ["name","sender","rating"],
    columns: [
      { key: 'name', label: 'Nội dung phản hồi' },
      { key: 'sender', label: 'Người gửi' },
      { key: 'rating', label: 'Đánh giá' },
      { key: 'question', label: 'Câu hỏi của người dùng' },
      { key: 'source', label: 'Nguồn tham khảo' },
    ],
    fields: [],
    details: [
      { key: 'sender', label: 'Người gửi' },
      { key: 'rating', label: 'Đánh giá' },
      { key: 'question', label: 'Câu hỏi của người dùng' },
      { key: 'answer', label: 'Câu trả lời của AI' },
      { key: 'source', label: 'Nguồn tham khảo của câu trả lời' },
      { key: 'comment', label: 'Nhận xét / nội dung báo cáo' },
      { key: 'reply', label: 'Phản hồi của quản trị viên' },
    ],
  },
  audit: {
    title: 'Nhật ký quản trị',
    description: 'Tra cứu lịch sử thao tác quản trị. Nhật ký chỉ được xem, không được chỉnh sửa.',
    icon: 'history',
    singular: 'nhật ký',
    statuses: { RECORDED: 'Đã ghi nhận' },
    listKeys: ['createdAt', 'name', 'actor', 'resource'],
    columns: [
      { key: 'createdAt', label: 'Thời điểm thao tác' },
      { key: 'name', label: 'Thao tác' },
      { key: 'actor', label: 'Người thực hiện' },
      { key: 'resource', label: 'Đối tượng' },
      { key: 'description', label: 'Nội dung thay đổi' },
    ],
    fields: [],
    details: [
      { key: 'createdAt', label: 'Thời điểm thao tác' },
      { key: 'actor', label: 'Người thực hiện' },
      { key: 'resource', label: 'Đối tượng' },
      { key: 'description', label: 'Nội dung thay đổi' },
    ],
  },
};

export function translateAdminError(error: string, lang: Language): string {
  const translated = translateMessage(error, lang);
  if (lang !== 'en' || translated !== error) return translated;
  for (const config of Object.values(adminConfigs)) {
    for (const field of config.fields) {
      const label = translateMessage(field.label, lang);
      if (error === `Vui lòng nhập ${field.label.toLocaleLowerCase('vi-VN')}.`) return `Please enter ${label.toLocaleLowerCase('en-US')}.`;
      if (error === `${field.label} không hợp lệ.`) return `${label} is invalid.`;
      if (field.maxLength && error === `${field.label} không được vượt quá ${field.maxLength} ký tự.`) return `${label} must not exceed ${field.maxLength} characters.`;
    }
  }
  return error;
}

export function displayValue(key: string, value: string | undefined, lang: Language = 'vi'): string {
  if (!value) return translateMessage('Chưa có thông tin', lang);
  // Translate system labels, while leaving names and user-authored content intact.
  if (['verified', 'farmsSummary', 'zonesSummary', 'ownerName', 'address', 'scaleSummary', 'zoneSummary', 'staffSummary', 'farmName', 'assignedStaff', 'areaDisplay', 'blocksSummary', 'zoneName', 'soilType', 'phiStatus'].includes(key)) {
    const translated = translateMessage(value, lang);
    if (translated !== value) return translated;
    if (lang === 'en' && key === 'scaleSummary') return value.replace(/^(\d+) phân khu · (\d+) lô đất$/, '$1 zones · $2 blocks');
  }
  const dictionaries: Record<string, Record<string, string>> = {
    role: roleLabels,
    group: { ALL: 'Tất cả nhóm cây', ...cropGroups },
    areaUnit: areaUnits,
    requirement: requirementLabels,
    activity: activityLabels,
    field: fieldLabels,
    rating: ratingLabels,
    category: articleCategories,
  };
  if (dictionaries[key]) {
    const label = dictionaries[key][value];
    return label ? translateMessage(label, lang) : value;
  }
  if (key.endsWith('At')) {
    const date = new Date(value.length === 10 ? value + 'T00:00:00' : value);
    return Number.isNaN(date.getTime()) ? value : value.length > 10 ? formatDateTime(date, lang) : formatDate(value, lang);
  }
  return value;
}
