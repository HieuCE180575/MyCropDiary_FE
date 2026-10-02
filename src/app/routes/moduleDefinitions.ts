import type { ModuleDefinition } from '../../shared/types/module';

// Report 3: Actors (pp. 11–12) and detailed use cases (pp. 19–29).
export const moduleDefinitions: ModuleDefinition[] = [
  {
    "key": "farm-registration",
    "path": "farm-registration",
    "title": "Đăng ký trang trại",
    "ucRange": "UC-09",
    "group": "farm",
    "access": "user",
    "icon": "plus",
    "description": "Gửi yêu cầu đăng ký; xem chi tiết, theo dõi trạng thái, sửa hoặc hủy yêu cầu đang chờ duyệt."
  },
  {
    "key": "knowledge",
    "path": "knowledge",
    "title": "Kiến thức nông nghiệp",
    "ucRange": "UC-01–03",
    "group": "public",
    "access": "account",
    "icon": "book",
    "description": "Tìm kiếm, lọc và đọc các bài viết kiến thức VietGAP công khai."
  },
  {
    "key": "ai",
    "path": "ai",
    "title": "Trợ lý AI",
    "ucRange": "UC-10",
    "group": "ai",
    "access": "user",
    "icon": "bot",
    "description": "Đặt câu hỏi và nhận hướng dẫn từ nguồn kiến thức đã được phê duyệt."
  },
  {
    "key": "ai-history",
    "path": "ai-history",
    "title": "Lịch sử hội thoại",
    "ucRange": "UC-11",
    "group": "ai",
    "access": "user",
    "icon": "history",
    "description": "Xem, tìm kiếm, đọc chi tiết và xóa hội thoại AI của bạn."
  },
  {
    "key": "ai-feedback",
    "path": "ai-feedback",
    "title": "Phản hồi của tôi",
    "ucRange": "UC-12",
    "group": "ai",
    "access": "user",
    "icon": "message",
    "description": "Gửi, sửa và xem phản hồi của bạn; báo cáo câu trả lời AI không chính xác hoặc không phù hợp."
  },
  {
    "key": "profile",
    "path": "profile",
    "title": "Hồ sơ cá nhân",
    "ucRange": "UC-07",
    "group": "account",
    "access": "account",
    "icon": "user",
    "description": "Xem và cập nhật thông tin cá nhân của bạn."
  },
  {
    "key": "password",
    "path": "change-password",
    "title": "Đổi mật khẩu",
    "ucRange": "UC-08",
    "group": "account",
    "access": "account",
    "icon": "lock",
    "description": "Xác minh mật khẩu hiện tại và đặt mật khẩu mới cho tài khoản."
  },
  {
    "key": "farm",
    "path": "farm",
    "title": "Thông tin trang trại",
    "ucRange": "UC-13",
    "group": "farm",
    "access": "farm",
    "icon": "home",
    "description": "Xem thông tin trang trại đang tham gia. Chủ trang trại được cập nhật thông tin."
  },
  {
    "key": "workers",
    "path": "workers",
    "title": "Người lao động",
    "ucRange": "UC-14–15",
    "group": "farm",
    "access": "farm",
    "icon": "user",
    "description": "Quản lý hồ sơ người lao động trong phạm vi được phân công."
  },
  {
    "key": "production",
    "path": "production-areas",
    "title": "Khu sản xuất & lô đất",
    "ucRange": "UC-16–17",
    "group": "production",
    "access": "farm",
    "icon": "plots",
    "description": "Xem khu sản xuất và cập nhật lô đất trong phạm vi được phân công. Chủ trang trại quản lý việc tạo và xóa."
  },
  {
    "key": "environment",
    "path": "environment",
    "title": "Điều kiện & môi trường",
    "ucRange": "UC-18–21",
    "group": "production",
    "access": "farm",
    "icon": "drop",
    "description": "Ghi nhận điều kiện lô đất; quản lý đánh giá rủi ro, đất và nước."
  },
  {
    "key": "seasons",
    "path": "crop-seasons",
    "title": "Mùa vụ",
    "ucRange": "UC-22",
    "group": "operations",
    "access": "farm",
    "icon": "calendar",
    "description": "Quản lý mùa vụ trong phạm vi trang trại được cấp quyền."
  },
  {
    "key": "tasks",
    "path": "tasks",
    "title": "Công việc",
    "ucRange": "UC-23",
    "group": "operations",
    "access": "farm",
    "icon": "check",
    "description": "Xem và cập nhật công việc được giao. Chủ trang trại quản lý và xét duyệt công việc."
  },
  {
    "key": "activities",
    "path": "activities",
    "title": "Nhật ký canh tác",
    "ucRange": "UC-24",
    "group": "operations",
    "access": "farm",
    "icon": "book",
    "description": "Ghi nhận và cập nhật hoạt động canh tác trong phạm vi được phân công."
  },
  {
    "key": "materials",
    "path": "materials",
    "title": "Sử dụng vật tư",
    "ucRange": "UC-25",
    "group": "operations",
    "access": "farm",
    "icon": "box",
    "description": "Ghi nhận và cập nhật việc sử dụng vật tư cho hoạt động canh tác."
  },
  {
    "key": "harvests",
    "path": "harvests",
    "title": "Thu hoạch & truy xuất",
    "ucRange": "UC-26, 30",
    "group": "operations",
    "access": "farm",
    "icon": "leaf",
    "description": "Ghi nhận thu hoạch và xem truy xuất các lô thu hoạch."
  },
  {
    "key": "training",
    "path": "training",
    "title": "Đào tạo",
    "ucRange": "UC-27",
    "group": "compliance",
    "access": "farm",
    "icon": "book",
    "description": "Ghi nhận và cập nhật hoạt động đào tạo trong trang trại."
  },
  {
    "key": "checklists",
    "path": "checklists",
    "title": "Bảng kiểm VietGAP",
    "ucRange": "UC-28",
    "group": "compliance",
    "access": "farm",
    "icon": "check",
    "description": "Kiểm tra mức độ đầy đủ của hồ sơ sản xuất theo các tiêu chí VietGAP."
  },
  {
    "key": "assessments",
    "path": "assessments",
    "title": "Đánh giá nội bộ",
    "ucRange": "UC-29",
    "group": "compliance",
    "access": "farm",
    "icon": "check",
    "description": "Tạo và xem hồ sơ đánh giá nội bộ trong trang trại."
  },
  {
    "key": "reports",
    "path": "reports",
    "title": "Báo cáo sản xuất",
    "ucRange": "UC-31",
    "group": "reports",
    "access": "farm",
    "icon": "report",
    "description": "Xem báo cáo sản xuất và mùa vụ. Chủ trang trại được tạo và xuất báo cáo."
  },
  {
    "key": "ai-drafts",
    "path": "ai-drafts",
    "title": "Bản nháp canh tác AI",
    "ucRange": "UC-32",
    "group": "ai",
    "access": "farm",
    "icon": "bot",
    "description": "Tạo, xem lại, sửa, xác nhận hoặc hủy bản nháp canh tác do AI hỗ trợ."
  },
  {
    "key": "members",
    "path": "members",
    "title": "Nhân sự & phân công",
    "ucRange": "UC-33–34",
    "group": "farm",
    "access": "owner",
    "icon": "user",
    "description": "Quản lý thành viên và phân công nhân viên theo khu sản xuất của trang trại."
  },
  {
    "key": "suppliers",
    "path": "suppliers",
    "title": "Nhà cung cấp",
    "ucRange": "UC-35",
    "group": "operations",
    "access": "owner",
    "icon": "box",
    "description": "Quản lý các nhà cung cấp vật tư của trang trại."
  },
  {
    "key": "purchases",
    "path": "purchases",
    "title": "Mua vật tư",
    "ucRange": "UC-36",
    "group": "operations",
    "access": "owner",
    "icon": "box",
    "description": "Ghi nhận, tìm kiếm và cập nhật các lần mua vật tư đầu vào."
  },
  {
    "key": "expenses",
    "path": "expenses",
    "title": "Chi phí",
    "ucRange": "UC-37",
    "group": "reports",
    "access": "owner",
    "icon": "money",
    "description": "Quản lý chi phí sản xuất và xem tổng hợp chi phí theo mùa vụ."
  },
  {
    "key": "admin",
    "path": "admin",
    "title": "Quản trị hệ thống",
    "ucRange": "UC-38–44",
    "group": "admin",
    "access": "admin",
    "icon": "report",
    "description": "Xét duyệt đăng ký trang trại; quản lý tài khoản, nội dung, phản hồi AI và thống kê hệ thống."
  },
  {
    "key": "admin-registrations",
    "path": "admin/registrations",
    "title": "Duyệt đăng ký trang trại",
    "ucRange": "UC-38",
    "icon": "plots",
    "description": "Xem, duyệt hoặc từ chối hồ sơ đăng ký trang trại.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-users",
    "path": "admin/users",
    "title": "Quản lý tài khoản",
    "ucRange": "UC-39",
    "icon": "user",
    "description": "Tìm kiếm, xem chi tiết và khóa hoặc mở khóa tài khoản.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-crops",
    "path": "admin/crops",
    "title": "Danh mục cây trồng",
    "ucRange": "UC-40",
    "icon": "leaf",
    "description": "Tạo, sửa và quản lý trạng thái danh mục cây trồng.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-rules",
    "path": "admin/rules",
    "title": "Quy tắc bảng kiểm",
    "ucRange": "UC-41",
    "icon": "check",
    "description": "Quản lý trường kiểm tra, phạm vi và mức yêu cầu.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-articles",
    "path": "admin/articles",
    "title": "Bài viết kiến thức",
    "ucRange": "UC-42",
    "icon": "book",
    "description": "Biên soạn, duyệt, công bố và lưu trữ bài viết kiến thức.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-feedback",
    "path": "admin/feedback",
    "title": "Phản hồi AI",
    "ucRange": "UC-43",
    "icon": "message",
    "description": "Xem, trả lời và cập nhật trạng thái phản hồi của người dùng.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-statistics",
    "path": "admin/statistics",
    "title": "Thống kê hệ thống",
    "ucRange": "UC-44",
    "icon": "report",
    "description": "Xem thống kê người dùng, mùa vụ, chi phí và bảng kiểm.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-audit",
    "path": "admin/audit",
    "title": "Nhật ký quản trị",
    "ucRange": "§3.9.5",
    "icon": "history",
    "description": "Tra cứu lịch sử thao tác quản trị.",
    "group": "admin",
    "access": "admin"
  }
];
