# Giao diện quản trị — Report 3 v1.0

## Phạm vi và căn cứ

Dựa trên Actors (trang PDF 11–12), UC-38–44 (trang 28–29),
Manage Knowledge Base và Administration (trang 172–180), cùng các trạng thái
ở trang 187–188. Nhật ký quản trị lấy từ mục 3.9.5.

Đăng nhập bằng tài khoản có `systemRole: ADMIN` sẽ chuyển từ `/dashboard`
sang `/admin`. Sidebar và các đường dẫn đều dùng kiểm tra quyền chung;
User không được mở các trang quản trị bằng URL trực tiếp.

| Đường dẫn | Màn hình và thao tác |
| --- | --- |
| `/admin` | Tổng quan; số lượng cần xử lý; hồ sơ gần đây; nhật ký gần nhất |
| `/admin/registrations` | Lọc, phân trang, chi tiết; duyệt/từ chối hồ sơ chờ duyệt, yêu cầu lý do từ chối |
| `/admin/users` | Tìm kiếm, lọc vai trò/trạng thái/ngày; chi tiết; xác nhận khóa/mở khóa |
| `/admin/crops` | Thêm, sửa, xem chi tiết, kích hoạt/ngừng dùng; không xóa dữ liệu lịch sử |
| `/admin/rules` | Thêm/sửa tiêu chí từ lựa chọn định sẵn; kiểm tra trùng phạm vi đang áp dụng |
| `/admin/articles` | Biên soạn bản nháp; duyệt/công bố khi có nguồn; lưu trữ/ngừng công bố |
| `/admin/feedback` | Xem câu hỏi, câu trả lời, nguồn, đánh giá; nhập phản hồi và đổi trạng thái xử lý |
| `/admin/statistics` | 4 nhóm: người dùng, mùa vụ, chi phí, bảng kiểm; lọc theo tháng; biểu đồ và bảng số liệu |
| `/admin/audit` | Nhật ký chỉ đọc; tìm theo người, thao tác, đối tượng và khoảng ngày |

Toàn bộ nhãn, thông báo, biểu mẫu và trạng thái hiển thị bằng tiếng Việt.
Các cửa sổ dùng `dialog` gốc để giữ focus, đóng bằng Escape; danh sách có trạng
thái không tìm thấy kết quả; bố cục có breakpoint cho màn hình nhỏ.

## Dữ liệu và giới hạn

Đây là **giao diện tương tác dùng dữ liệu minh họa**, không phải tích hợp API
quản trị. Backend tại thời điểm triển khai chỉ có controller xác thực, trang
trại, danh mục module và đọc bài viết công khai; chưa có hợp đồng API cho các
thao tác quản trị nêu trên. Không giả định endpoint và không sửa backend.

- Đã bỏ banner “Bản xem trước” theo yêu cầu giao diện; nguồn dữ liệu vẫn là dữ liệu minh họa.
- Fixtures là thông tin hư cấu, email thuộc `example.com`.
- Các thay đổi nằm trong React state, giữ qua chuyển trang trong cùng phiên;
  tải lại hoặc đăng xuất sẽ khởi tạo lại. Không lưu vào localStorage/database.
- Duyệt hồ sơ chỉ mô phỏng trạng thái, không thực sự tạo trang trại/cấp Owner.
- Khóa tài khoản và phản hồi AI chỉ tác động dữ liệu minh họa, không khóa hoặc
  gửi tin đến người thật.
- Việc sửa bài đã duyệt đưa bài về bản nháp; hội thoại lịch sử không thay đổi.
- Nhật ký của thao tác thử và số lượng trên tổng quan cập nhật đồng bộ.
- Danh mục trường kiểm tra, trạng thái xử lý phản hồi `OPEN/IN_REVIEW/RESOLVED`
  là lựa chọn cho giao diện; cần đối chiếu hợp đồng backend trước khi tích hợp.
- Thống kê mùa vụ/chi phí/bảng kiểm là tập số liệu tổng hợp minh họa tháng 4–9/2026.
- Tài khoản quản trị mẫu được bảo vệ khỏi thao tác khóa trong bản xem trước.
- Hồ sơ cá nhân vẫn hiển thị tài khoản đăng nhập thật; cập nhật hồ sơ/đổi mật
  khẩu thuộc phần tài khoản chung chưa được triển khai trong lần sửa này.

`adminModel.ts` xử lý kiểm tra và chuyển trạng thái riêng với giao diện, để có
thể thay nguồn dữ liệu minh họa bằng lời gọi API sau khi có hợp đồng backend.
Backend vẫn phải kiểm tra quyền, trạng thái hồ sơ và các quy tắc nghiệp vụ.

## Kiểm tra

- `npm run build`: TypeScript và bản build sản xuất.
- `npm test`: phân quyền/menu/route, quy tắc nghiệp vụ và tương tác DOM.
- Bài kiểm tra tương tác dùng jsdom, thao tác qua nút/form thực tế: phân trang,
  tìm kiếm tiếng Việt không dấu, từ chối, duyệt bài, khóa tài khoản, thêm danh
  mục, xử lý phản hồi, nhật ký và bộ lọc thống kê. Không cho phép gọi mạng.
- Chưa kiểm tra hình ảnh trên trình duyệt thật: công cụ Browser bị lỗi kết nối.
