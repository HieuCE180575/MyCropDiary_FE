import type { Collection, CollectionConfig } from './adminTypes';

export const roleLabels = { USER: 'Người dùng', ADMIN: 'Quản trị viên' };
export const cropGroups = { LEAFY: 'Rau ăn lá', FRUIT: 'Rau ăn quả', ROOT: 'Rau ăn củ', HERB: 'Rau gia vị' };
export const requirementLabels = { REQUIRED: 'Bắt buộc', RECOMMENDED: 'Khuyến nghị', NOT_APPLICABLE: 'Không áp dụng' };
export const activityLabels = { ALL: 'Tất cả hoạt động', PLANTING: 'Gieo trồng', FERTILIZING: 'Bón phân', SPRAYING: 'Phun thuốc', WATERING: 'Tưới nước', CARE: 'Chăm sóc', HARVESTING: 'Thu hoạch', OTHER: 'Hoạt động khác' };
export const fieldLabels = { ACTIVITY_DATE: 'Ngày thực hiện', RESPONSIBLE_PERSON: 'Người thực hiện', MATERIAL_NAME: 'Tên vật tư', MATERIAL_QUANTITY: 'Lượng vật tư sử dụng', WITHHOLDING_DAYS: 'Thời gian cách ly', HARVEST_QUANTITY: 'Sản lượng thu hoạch' };
export const ratingLabels = { HELPFUL: 'Hữu ích', NOT_HELPFUL: 'Chưa hữu ích' };
export const articleCategories = { VIETGAP: 'Tiêu chuẩn VietGAP', DIARY: 'Ghi chép canh tác', SOIL_WATER: 'Đất và nước', MATERIALS: 'Vật tư nông nghiệp' };
export const feedbackStatuses = { OPEN: 'Mới tiếp nhận', IN_REVIEW: 'Đang xử lý', RESOLVED: 'Đã giải quyết' };

export const adminConfigs: Record<Collection, CollectionConfig> = {
  registrations: {
    title: 'Duyệt đăng ký trang trại', description: 'Kiểm tra hồ sơ và xét duyệt yêu cầu mở trang trại của người dùng.', icon: 'plots', singular: 'hồ sơ đăng ký',
    statuses: { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' },
    columns: [{ key: 'name', label: 'Trang trại' }, { key: 'applicant', label: 'Người đăng ký' }, { key: 'province', label: 'Tỉnh / thành phố' }, { key: 'createdAt', label: 'Ngày gửi' }], fields: [],
    details: [{ key: 'applicant', label: 'Người đăng ký' }, { key: 'email', label: 'Email liên hệ' }, { key: 'address', label: 'Địa chỉ trang trại' }, { key: 'province', label: 'Tỉnh / thành phố' }, { key: 'description', label: 'Mô tả trang trại' }, { key: 'document', label: 'Tài liệu kèm theo' }, { key: 'reason', label: 'Lý do từ chối' }, { key: 'reviewer', label: 'Người xử lý' }, { key: 'reviewedAt', label: 'Ngày xử lý' }],
  },
  users: {
    title: 'Quản lý tài khoản', description: 'Tra cứu thông tin tài khoản và kiểm soát trạng thái truy cập hệ thống.', icon: 'user', singular: 'tài khoản',
    statuses: { ACTIVE: 'Đang hoạt động', LOCKED: 'Đã khóa' },
    columns: [{ key: 'name', label: 'Họ và tên' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Vai trò' }, { key: 'createdAt', label: 'Ngày đăng ký' }], fields: [],
    details: [{ key: 'email', label: 'Email' }, { key: 'phone', label: 'Số điện thoại' }, { key: 'role', label: 'Vai trò hệ thống' }, { key: 'verified', label: 'Xác thực email' }],
  },
  crops: {
    title: 'Danh mục cây trồng', description: 'Quản lý danh mục cây trồng dùng chung và duy trì dữ liệu lịch sử.', icon: 'leaf', singular: 'danh mục cây trồng', createLabel: 'Thêm danh mục',
    statuses: { ACTIVE: 'Đang sử dụng', INACTIVE: 'Ngừng sử dụng' },
    columns: [{ key: 'name', label: 'Tên danh mục' }, { key: 'code', label: 'Mã danh mục' }, { key: 'group', label: 'Nhóm cây trồng' }, { key: 'updatedAt', label: 'Cập nhật gần nhất' }],
    fields: [{ key: 'code', label: 'Mã danh mục', required: true, maxLength: 30 }, { key: 'name', label: 'Tên danh mục', required: true, maxLength: 150 }, { key: 'group', label: 'Nhóm cây trồng', type: 'select', options: cropGroups, required: true }, { key: 'description', label: 'Mô tả', type: 'textarea', maxLength: 1000 }],
  },
  rules: {
    title: 'Quy tắc bảng kiểm', description: 'Cấu hình tiêu chí kiểm tra hồ sơ cho các lần đánh giá tiếp theo.', icon: 'check', singular: 'quy tắc', createLabel: 'Thêm quy tắc',
    statuses: { ACTIVE: 'Đang áp dụng', INACTIVE: 'Ngừng áp dụng' },
    columns: [{ key: 'name', label: 'Tên quy tắc' }, { key: 'field', label: 'Trường kiểm tra' }, { key: 'activity', label: 'Hoạt động' }, { key: 'requirement', label: 'Mức yêu cầu' }],
    fields: [{ key: 'name', label: 'Tên quy tắc', required: true, maxLength: 150 }, { key: 'field', label: 'Trường kiểm tra', type: 'select', options: fieldLabels, required: true }, { key: 'activity', label: 'Phạm vi hoạt động', type: 'select', options: activityLabels, required: true }, { key: 'group', label: 'Nhóm cây trồng', type: 'select', options: { ALL: 'Tất cả nhóm cây', ...cropGroups }, required: true }, { key: 'requirement', label: 'Mức yêu cầu', type: 'select', options: requirementLabels, required: true }, { key: 'guidance', label: 'Hướng dẫn cho người dùng', type: 'textarea', maxLength: 1000 }],
  },
  articles: {
    title: 'Bài viết kiến thức', description: 'Biên soạn và duyệt nguồn kiến thức dùng chung cho người dùng và trợ lý AI.', icon: 'book', singular: 'bài viết', createLabel: 'Viết bài mới',
    statuses: { DRAFT: 'Bản nháp', APPROVED: 'Đã duyệt', ARCHIVED: 'Đã lưu trữ' },
    columns: [{ key: 'name', label: 'Tiêu đề' }, { key: 'category', label: 'Chuyên mục' }, { key: 'author', label: 'Người biên soạn' }, { key: 'updatedAt', label: 'Cập nhật gần nhất' }],
    fields: [{ key: 'name', label: 'Tiêu đề bài viết', required: true, maxLength: 200 }, { key: 'category', label: 'Chuyên mục', type: 'select', options: articleCategories, required: true }, { key: 'source', label: 'Nguồn tham khảo', maxLength: 1000 }, { key: 'content', label: 'Nội dung bài viết', type: 'textarea', required: true, maxLength: 20000 }],
    details: [{ key: 'author', label: 'Người biên soạn' }],
  },
  feedback: {
    title: 'Phản hồi AI', description: 'Đọc phản hồi, xem ngữ cảnh hội thoại và trả lời người gửi.', icon: 'message', singular: 'phản hồi',
    statuses: feedbackStatuses,
    columns: [{ key: 'name', label: 'Nội dung phản hồi' }, { key: 'sender', label: 'Người gửi' }, { key: 'rating', label: 'Đánh giá' }, { key: 'createdAt', label: 'Ngày gửi' }], fields: [],
    details: [{ key: 'sender', label: 'Người gửi' }, { key: 'rating', label: 'Đánh giá' }, { key: 'question', label: 'Câu hỏi của người dùng' }, { key: 'answer', label: 'Câu trả lời của AI' }, { key: 'source', label: 'Nguồn tham khảo của câu trả lời' }, { key: 'comment', label: 'Nhận xét / nội dung báo cáo' }, { key: 'reply', label: 'Phản hồi của quản trị viên' }],
  },
  audit: {
    title: 'Nhật ký quản trị', description: 'Tra cứu lịch sử thao tác quản trị. Nhật ký chỉ được xem, không được chỉnh sửa.', icon: 'history', singular: 'nhật ký', statuses: { RECORDED: 'Đã ghi nhận' },
    columns: [{ key: 'createdAt', label: 'Thời gian' }, { key: 'actor', label: 'Người thực hiện' }, { key: 'name', label: 'Thao tác' }, { key: 'resource', label: 'Đối tượng' }], fields: [],
    details: [{ key: 'actor', label: 'Người thực hiện' }, { key: 'resource', label: 'Đối tượng' }, { key: 'resourceId', label: 'Mã bản ghi' }, { key: 'description', label: 'Nội dung thay đổi' }],
  },
};

export function displayValue(key: string, value: string | undefined): string {
  if (!value) return 'Chưa có thông tin';
  const dictionaries: Record<string, Record<string, string>> = { role: roleLabels, group: { ALL: 'Tất cả nhóm cây', ...cropGroups }, requirement: requirementLabels, activity: activityLabels, field: fieldLabels, rating: ratingLabels, category: articleCategories };
  if (dictionaries[key]) return dictionaries[key][value] ?? value;
  if (key.endsWith('At')) {
    const date = new Date(value.length === 10 ? value + 'T00:00:00' : value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + (value.length > 10 ? ' · ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');
  }
  return value;
}
