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
JWT được giữ trong bộ nhớ tab; tải lại trang cần đăng nhập lại. Đăng xuất và
phản hồi 401 xóa phiên. Không lưu mật khẩu hoặc refresh token. Backend đã trả
refresh token nhưng chưa có endpoint refresh nên frontend chưa tự gia hạn.

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

## Kiểm tra

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