# Kết nối backend hiện tại

Chạy `npm run dev`, mở `http://localhost:5173`. Backend mặc định:
`http://localhost:8080/api/v1`; có thể đổi bằng `VITE_API_BASE_URL` trong `.env`
và khởi động lại Vite. Cổng frontend cố định 5173 để khớp CORS backend.

## Đăng nhập bằng tài khoản database

Frontend gọi `POST /auth/login`, JSON `{ "email": "…", "password": "…" }`.
Backend xác thực tài khoản AppUser và trả `ApiResponse<AuthResponse>` với
`data.accessToken`, `refreshToken`, `tokenType`, `userId`, `email`, `fullName`,
`systemRole`. Frontend dùng accessToken với `Authorization: Bearer <token>`.
Không còn sử dụng HTTP Basic hoặc endpoint công khai `/modules` để đăng nhập.

Dùng email và mật khẩu tài khoản đã kích hoạt. Frontend hiển thị thông báo
backend khi sai thông tin, tài khoản chưa xác thực OTP hoặc bị khóa.
Access token, refresh token và thông tin người dùng được giữ trong bộ nhớ và
sessionStorage của tab, không ghi vào localStorage. Tải lại trang sẽ khôi phục phiên
trước khi kiểm tra quyền truy cập; phiên không được lưu lâu dài sau khi đóng tab.
Đăng nhập và xác thực OTP đều lưu cả hai token. Refresh thành công và cập nhật hồ sơ
đều cập nhật phiên đã lưu; đăng xuất hoặc refresh bị từ chối sẽ xóa phiên đã lưu.
Nếu trình duyệt chặn sessionStorage, phiên chỉ hoạt động trong bộ nhớ đến khi tải lại trang.
Khi access token đã hết hạn theo JWT hoặc API có xác thực trả 401, frontend gọi
`POST /auth/refresh-token` với `{ refreshToken }`, cập nhật token và thử lại yêu cầu
tối đa một lần. Nhiều yêu cầu đồng thời dùng chung một lần refresh. Phản hồi 403
do thiếu quyền không kích hoạt refresh. API đăng nhập/OTP/refresh chạy ẩn danh,
không tự refresh khi lỗi. Refresh token hết hạn hoặc bị thu hồi sẽ xóa phiên;
lỗi mạng hoặc lỗi máy chủ tạm thời giữ phiên để có thể thử lại. Đăng xuất xóa cả
hai token ở frontend và gọi `POST /auth/logout` với refresh token vừa lưu để backend
thu hồi token đó. API này chạy ẩn danh để vẫn gọi được khi access token hết hạn;
nếu mất mạng, frontend vẫn thoát phiên nhưng không bảo đảm thu hồi trên backend.
Kết quả refresh đến muộn không thể khôi phục phiên đã kết thúc.

## Trang trại và danh mục

Dashboard và `/farm` gọi `GET /farms?page=0&size=12`, sau đó cho phép chuyển
trang. Response là `data.items`, `page`, `size`, `totalElements`, `totalPages`,
`last`. Mỗi trang trại dùng `id`, `farmCode`, `farmName`, `province`, `district`,
`totalAreaM2`, `status`, `currentUserRole` đúng DTO backend.

Dashboard lấy danh mục qua `GET /modules` (endpoint công khai).
Có trạng thái tải, lỗi, rỗng và thử lại. Các màn hình nghiệp vụ khác vẫn đang
phát triển. Backend hiện có thêm API bài viết, tạo/sửa trang trại,
thành viên và vùng sản xuất; những màn hình này chưa được triển khai trong lần
sửa các lời gọi API hiện có này. Không chỉnh sửa code backend.

## Đăng ký trang trại và xét duyệt

- User: `GET /farm-registrations` và `GET /farm-registrations/{id}` lấy hồ sơ mới nhất;
  `POST /farm-registrations` gửi `{ farmName, addressLine, province, district, ward, description, documentUrl }`;
  `PATCH /farm-registrations/{id}/cancel` hủy hồ sơ chờ duyệt.
- Admin: `GET /admin/farm-registrations` tải hồ sơ có phân trang;
  `PUT /admin/farm-registrations/{id}/handle` gửi `{ action, rejectionReason }`.
  `action` là `APPROVED` hoặc `REJECTED`; từ chối bắt buộc có lý do.
- Dùng chung HTTP client và JWT hiện có. Backend xác định người nộp qua phiên đăng nhập.
  Duyệt thành công do backend tạo Farm và gán OWNER. Bấm “Cập nhật trạng thái” ở User
  để tải lại hồ sơ và danh sách trang trại sau khi admin xử lý.
- Form có đủ 7 trường backend hiện lưu thật: tên (tối đa 160 ký tự theo DB),
  địa chỉ (300), tỉnh/thành, quận/huyện, phường/xã (mỗi trường 100), mô tả (1000),
  link tài liệu (1000, http/https). Chỉ tên và địa chỉ bắt buộc.
  Các trường tùy chọn để trống được gửi là null. Tài liệu dùng link có sẵn, chưa upload file.
  Backend đã tách registration_note (mô tả) và rejection_reason (lý do từ chối).
  Frontend đọc description và rejectionReason riêng; khi xử lý hồ sơ chỉ gửi action/rejectionReason.
  DB đang chạy cần có các cột province, district, ward, document_url như entity/script SQL mới.
- Riêng hồ sơ đăng ký và số liệu hồ sơ trên tổng quan admin dùng API thật;
  các module admin khác giữ hành vi hiện có. Không thay đổi backend hoặc schema DB.

## Kiểm tra tích hợp

`npm test` kiểm tra body đăng nhập, JWT Bearer, phân trang và xử lý lỗi bằng
transport mô phỏng. `npm run build` kiểm tra TypeScript và build ứng dụng.
Đăng nhập thành công trên hệ thống thật cần tài khoản đã kích hoạt.
## Đăng ký và xác thực email

Mở `/register` hoặc bấm Sign up từ màn hình đăng nhập.
- Gửi họ tên, email, số điện thoại tùy chọn và mật khẩu qua `POST /auth/register`.
- Mật khẩu tối thiểu 8 ký tự; frontend giới hạn tối đa 72 byte UTF-8 để phù hợp BCrypt.
- Đăng ký thành công chỉ chuyển sang nhập OTP, chưa tạo phiên đăng nhập.
- `POST /auth/verify-otp` nhận `{ email, otp }`; OTP giữ dạng chuỗi 6 chữ số.
- Xác thực thành công lưu access token trong bộ nhớ và chuyển tới dashboard.
- Gửi lại OTP qua `POST /auth/resend-otp?email=...` (email được URL-encode).
- Nếu tải lại trang khi chờ OTP, nhập lại email và chọn “Đã đăng ký nhưng chưa xác thực email?”.

Email đã tồn tại không thể đăng ký lại. Dùng email mới mà bạn nhận được thư.
Backend hiện bắt lỗi SMTP và vẫn trả thành công đăng ký, vì vậy response thành
công chưa bảo đảm email đã được gửi. Nếu không nhận được OTP, kiểm tra thư rác,
thử gửi lại và kiểm tra cấu hình SMTP/log backend. Không sửa dữ liệu DB thủ công.
