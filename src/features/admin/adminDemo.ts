import type { AdminRecord, AdminState } from './adminTypes';

// Fictional preview fixtures. Never merged into API responses or persisted as real records.
const record = (id: string, name: string, status: string, extra: Record<string, string> = {}): AdminRecord => ({ id, name, status, createdAt: '2026-09-20', updatedAt: '2026-09-28', ...extra });
export function createAdminDemo(): AdminState {
  return {
    registrations: [
      record('DK-008', 'Vườn rau An Nhiên', 'PENDING', { applicant: 'Nguyễn Minh An', email: 'minhan@example.com', province: 'Cần Thơ', address: 'Khu vực Bình An, Cần Thơ', description: 'Mô hình trồng rau ăn lá theo hướng VietGAP.', document: 'Bản mô tả khu sản xuất (minh họa)', createdAt: '2026-09-29' }),
      record('DK-007', 'Trang trại Bình Minh', 'PENDING', { applicant: 'Trần Ngọc Bình', email: 'ngocbinh@example.com', province: 'Vĩnh Long', address: 'Khu vực Bình Minh, Vĩnh Long', description: 'Sản xuất dưa leo và rau ăn quả.', document: 'Chưa đính kèm', createdAt: '2026-09-28' }),
      record('DK-006', 'Vườn Xanh Miền Tây', 'PENDING', { applicant: 'Lê Hoài Phương', email: 'hoaiphuong@example.com', province: 'Đồng Tháp', address: 'Khu vực Cao Lãnh, Đồng Tháp', description: 'Trang trại rau gia vị và rau ăn lá.', document: 'Sơ đồ khu đất (minh họa)', createdAt: '2026-09-26' }),
      record('DK-005', 'Nông trại Hương Đất', 'APPROVED', { applicant: 'Phạm Thanh Hà', email: 'thanhha@example.com', province: 'Cần Thơ', address: 'Khu vực Phong Điền, Cần Thơ', description: 'Mô hình canh tác rau ngắn ngày.', reviewer: 'Quản trị viên mẫu', reviewedAt: '2026-09-23', createdAt: '2026-09-21' }),
      record('DK-004', 'Vườn rau Thuận Phát', 'REJECTED', { applicant: 'Võ Đức Thành', email: 'ducthanh@example.com', province: 'An Giang', address: 'Khu vực Long Xuyên, An Giang', description: 'Vườn rau gia đình.', reason: 'Vui lòng bổ sung địa chỉ và mô tả phạm vi khu sản xuất.', reviewer: 'Quản trị viên mẫu', reviewedAt: '2026-09-19', createdAt: '2026-09-18' }),
      record('DK-003', 'Vườn nhà Mai', 'CANCELLED', { applicant: 'Đặng Ngọc Mai', email: 'ngocmai@example.com', province: 'Vĩnh Long', address: 'Khu vực Trà Ôn, Vĩnh Long', description: 'Người đăng ký đã hủy yêu cầu.', createdAt: '2026-09-15' }),
    ],
    users: [
      record('ND-001', 'Nguyễn Minh An', 'ACTIVE', { email: 'minhan@example.com', role: 'USER', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-04-08' }),
      record('ND-002', 'Trần Ngọc Bình', 'ACTIVE', { email: 'ngocbinh@example.com', role: 'USER', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-05-12' }),
      record('ND-003', 'Lê Hoài Phương', 'ACTIVE', { email: 'hoaiphuong@example.com', role: 'USER', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-06-03' }),
      record('ND-004', 'Phạm Thanh Hà', 'ACTIVE', { email: 'thanhha@example.com', role: 'USER', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-07-11' }),
      record('ND-005', 'Võ Đức Thành', 'LOCKED', { email: 'ducthanh@example.com', role: 'USER', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-08-15' }),
      record('ND-006', 'Đặng Ngọc Mai', 'ACTIVE', { email: 'ngocmai@example.com', role: 'USER', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-09-10' }),
      record('ND-007', 'Quản trị viên mẫu', 'ACTIVE', { email: 'quantri@example.com', role: 'ADMIN', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-04-01' }),
      record('ND-008', 'Bùi Thanh Trúc', 'ACTIVE', { email: 'thanhtruc@example.com', role: 'USER', phone: 'Chưa cập nhật', verified: 'Đã xác thực', createdAt: '2026-09-22' }),
    ],
    crops: [
      record('CT-001', 'Cải xanh', 'ACTIVE', { code: 'CAI_XANH', group: 'LEAFY', description: 'Nhóm cải xanh ngắn ngày.' }),
      record('CT-002', 'Xà lách', 'ACTIVE', { code: 'XA_LACH', group: 'LEAFY', description: 'Các giống xà lách trồng lấy lá.' }),
      record('CT-003', 'Dưa leo', 'ACTIVE', { code: 'DUA_LEO', group: 'FRUIT', description: 'Cây trồng lấy quả, canh tác theo mùa vụ.' }),
      record('CT-004', 'Củ cải', 'ACTIVE', { code: 'CU_CAI', group: 'ROOT', description: 'Nhóm rau ăn củ.' }),
      record('CT-005', 'Húng quế', 'INACTIVE', { code: 'HUNG_QUE', group: 'HERB', description: 'Danh mục tạm ngừng sử dụng, giữ lại hồ sơ lịch sử.' }),
    ],
    rules: [
      record('QT-001', 'Ghi ngày thực hiện hoạt động', 'ACTIVE', { field: 'ACTIVITY_DATE', activity: 'ALL', group: 'ALL', requirement: 'REQUIRED', guidance: 'Bổ sung ngày thực hiện cho từng hoạt động canh tác.' }),
      record('QT-002', 'Ghi người thực hiện', 'ACTIVE', { field: 'RESPONSIBLE_PERSON', activity: 'ALL', group: 'ALL', requirement: 'REQUIRED', guidance: 'Ghi rõ người chịu trách nhiệm thực hiện hoạt động.' }),
      record('QT-003', 'Theo dõi thời gian cách ly', 'ACTIVE', { field: 'WITHHOLDING_DAYS', activity: 'SPRAYING', group: 'ALL', requirement: 'REQUIRED', guidance: 'Ghi thời gian cách ly đúng theo nhãn và hướng dẫn sử dụng của sản phẩm.' }),
      record('QT-004', 'Ghi lượng vật tư khi bón phân', 'ACTIVE', { field: 'MATERIAL_QUANTITY', activity: 'FERTILIZING', group: 'LEAFY', requirement: 'REQUIRED', guidance: 'Ghi số lượng và đơn vị vật tư đã sử dụng.' }),
      record('QT-005', 'Ghi sản lượng thu hoạch', 'INACTIVE', { field: 'HARVEST_QUANTITY', activity: 'HARVESTING', group: 'ALL', requirement: 'RECOMMENDED', guidance: 'Bổ sung sản lượng để hoàn thiện hồ sơ mùa vụ.' }),
    ],
    articles: [
      record('BV-001', 'Bắt đầu ghi nhật ký canh tác', 'APPROVED', { category: 'DIARY', author: 'Quản trị viên mẫu', source: 'Tài liệu hướng dẫn ghi chép nội bộ — ví dụ minh họa', content: 'Nội dung minh họa cho giao diện bài viết.\n\nGhi chép theo từng mùa vụ, bao gồm ngày thực hiện, người thực hiện và mô tả hoạt động. Đối chiếu thông tin trước khi lưu hồ sơ.' }),
      record('BV-002', 'Chuẩn bị hồ sơ theo hướng VietGAP', 'APPROVED', { category: 'VIETGAP', author: 'Quản trị viên mẫu', source: 'Tài liệu hướng dẫn hồ sơ — ví dụ minh họa', content: 'Nội dung minh họa, chưa phải tài liệu chuyên môn đã được thẩm định.\n\nHồ sơ được sắp xếp theo mùa vụ và nhóm hoạt động để thuận tiện tra cứu.' }),
      record('BV-003', 'Ghi nhận vật tư sử dụng trong mùa vụ', 'DRAFT', { category: 'MATERIALS', author: 'Quản trị viên mẫu', source: '', content: 'Bản nháp minh họa cho quy trình biên soạn và duyệt kiến thức. Cần bổ sung nguồn tham khảo trước khi duyệt.' }),
      record('BV-004', 'Theo dõi nguồn nước tưới', 'ARCHIVED', { category: 'SOIL_WATER', author: 'Quản trị viên mẫu', source: 'Tài liệu cũ — ví dụ minh họa', content: 'Bài viết minh họa đã được lưu trữ và không dùng cho câu trả lời AI mới.' }),
    ],
    feedback: [
      record('PH-001', 'Câu trả lời thiếu nguồn tham khảo', 'OPEN', { sender: 'Nguyễn Minh An', rating: 'NOT_HELPFUL', question: 'Tôi cần ghi những thông tin gì sau khi bón phân?', answer: 'Bạn có thể ghi lại ngày thực hiện, loại vật tư và lượng sử dụng. (Câu trả lời minh họa)', source: 'Chưa có nguồn tham khảo', comment: 'Mong bổ sung nguồn tài liệu để tôi đối chiếu.', createdAt: '2026-09-29' }),
      record('PH-002', 'Cần hướng dẫn rõ cách ghi đơn vị', 'IN_REVIEW', { sender: 'Lê Hoài Phương', rating: 'NOT_HELPFUL', question: 'Lượng vật tư nên ghi bằng đơn vị nào?', answer: 'Ghi số lượng kèm đơn vị đo phù hợp. (Câu trả lời minh họa)', source: 'Hướng dẫn ghi chép nội bộ — minh họa', comment: 'Cần thêm ví dụ cách ghi kg và lít.', createdAt: '2026-09-28' }),
      record('PH-003', 'Hướng dẫn ghi nhật ký dễ hiểu', 'RESOLVED', { sender: 'Phạm Thanh Hà', rating: 'HELPFUL', question: 'Tôi bắt đầu ghi nhật ký canh tác như thế nào?', answer: 'Chọn mùa vụ và ghi nhận hoạt động theo ngày. (Câu trả lời minh họa)', source: 'Bắt đầu ghi nhật ký canh tác — minh họa', comment: 'Hướng dẫn rõ ràng, dễ làm theo.', reply: 'Cảm ơn bạn đã góp ý. Chúng tôi sẽ tiếp tục hoàn thiện hướng dẫn.', createdAt: '2026-09-24' }),
    ],
    audit: [
      record('NK-002', 'Duyệt đăng ký trang trại', 'RECORDED', { actor: 'Quản trị viên mẫu', resource: 'Hồ sơ đăng ký', resourceId: 'DK-005', description: 'Đã duyệt hồ sơ Nông trại Hương Đất trong dữ liệu minh họa.', createdAt: '2026-09-23T09:15:00+07:00' }),
      record('NK-001', 'Khóa tài khoản', 'RECORDED', { actor: 'Quản trị viên mẫu', resource: 'Tài khoản', resourceId: 'ND-005', description: 'Thao tác khóa tài khoản minh họa.', createdAt: '2026-09-20T14:30:00+07:00' }),
    ],
    seasons: [
      { month: '2026-04', planned: 2, active: 3, completed: 4, cancelled: 0, cost: 18500000, checked: 8, complete: 5 },
      { month: '2026-05', planned: 3, active: 4, completed: 5, cancelled: 1, cost: 23700000, checked: 11, complete: 8 },
      { month: '2026-06', planned: 2, active: 6, completed: 7, cancelled: 1, cost: 31200000, checked: 14, complete: 10 },
      { month: '2026-07', planned: 4, active: 7, completed: 8, cancelled: 0, cost: 36400000, checked: 17, complete: 13 },
      { month: '2026-08', planned: 5, active: 8, completed: 9, cancelled: 1, cost: 42100000, checked: 20, complete: 16 },
      { month: '2026-09', planned: 4, active: 9, completed: 11, cancelled: 1, cost: 47800000, checked: 23, complete: 19 },
    ],
  };
}
