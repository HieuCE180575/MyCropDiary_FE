# Shared components

Các component dùng chung: Button, PageHeading, Modal, Pagination, TablePagination,
StatusBadge, ConfirmDialog, EmptyState, LoadError và TabList. Không đặt nghiệp vụ riêng của một module vào đây.

## Quy chuẩn dùng chung

- Màu, font, kích thước và bo góc nằm ở `src/styles/tokens.css`; dùng biến theo vai trò, không đặt màu riêng cho cùng một loại control. `shared-ui.css` định nghĩa trực tiếp các component chung; các định nghĩa nội bộ cũ đã được gỡ.
- Dùng `Button` với `variant="primary"`, `secondary` hoặc `danger`; `size="compact"` dành cho vùng dày dữ liệu. Giữ các thuộc tính bố cục bên ngoài nút.
- Các ô nhập/chọn dùng `ui-input`, `ui-select`, `ui-textarea`, cao 44px và bo góc theo token; checkbox, radio và OTP giữ kích thước riêng.
- Nhóm ô trong form dùng `structured-field-card` bao cả nhãn, control, đơn vị, hướng dẫn và lỗi; đặt nhãn trực tiếp đầu khung hoặc trong `structured-field-header`. Khung và viền focus được định nghĩa chung trong `shared-ui.css`, theo mẫu ghi nhận thu hoạch. Dùng `ui-form-grid` cho hàng hai cột tự xuống dòng trên mobile.
- Dùng `PageHeading` cho tiêu đề, mô tả và nhóm hành động; mặc định là `h1`. Nội dung nhúng trong trang khác dùng `level={2}` để có `h2` và cỡ chữ section. Hero có thể giữ thang chữ riêng.
- Bảng dùng `ui-data-table` bên trong `ui-table-scroll` có `tabIndex={0}`; giữ cấu trúc cột theo nghiệp vụ, dùng `scope="col"` cho header. Biến thể `ui-data-table--wide` dành cho bảng nhiều cột. Nút hàng dùng `table-action-btns` và `table-icon-btn`; kích thước/khoảng cách có một nơi định nghĩa tại `shared-ui.css`.
- Mỗi control cần tên truy cập: liên kết `label htmlFor` với `id` duy nhất, label bao control hoặc `aria-labelledby`/`aria-label`. ID trong danh sách phải gắn với khóa bản ghi; không lồng label. Icon trang trí dùng span thay label. Lỗi lưu phải xuất hiện trong modal đang mở và giữ dữ liệu để thử lại.
- Phân biệt đang tải, danh sách rỗng và lỗi tải. Dùng `LoadError` với `message` và `onRetry` cho lỗi tải danh sách; không biến lỗi API thành danh sách rỗng.
- Dùng `TabList` cho tab và giữ cơ chế route/state của module. Chip bộ lọc bật/tắt dùng `aria-pressed`; CSS trạng thái chọn dựa trên thuộc tính này để đồng bộ màu và trạng thái truy cập.
- Dùng `Modal` và `ConfirmDialog` cho hộp thoại; `customLayout` dành cho form hiện có cần giữ header/body riêng, vẫn dùng chung Escape, focus và cuộn trang.
- Dùng `StatusBadge` theo ý nghĩa `success`, `warning`, `danger`, `info`, `neutral`. `EmptyState` nhận tên icon từ `Icon`.
- Dùng các hàm trong `shared/format/formatters.ts`, truyền `lang` hiện tại khi hiển thị số, ngày, ngày giờ và tiền VND. Giá trị thiếu hoặc không hợp lệ hiển thị `—`.
- Nhãn, placeholder và thông báo dùng `useLanguage().t()` với từ điển trong `shared/i18n/translations.ts`. Lưu khóa thông báo vào state và dịch lúc render để đổi ngôn ngữ không giữ lại thông báo cũ. Không dịch tên, mã định danh hoặc nội dung do người dùng nhập.
- Với thông báo có dữ liệu động, lưu `message('Added supplier "{value1}" successfully!', { value1: supplier.supplierName })` từ `shared/i18n/translate.ts`, rồi gọi `t(notification.text)` khi render. Giá trị chèn được giữ nguyên; dùng `message(statusKey)` lồng bên trong chỉ khi giá trị là nhãn UI cần dịch. Không lưu chuỗi đã ghép tên người dùng rồi mong từ điển tự dịch toàn bộ câu.
- Với danh sách đã tải đầy đủ, dùng `usePagination` và `TablePagination`; `resetKey` phải gồm trang trại và mọi bộ lọc. Với API phân trang, dùng metadata của server hoặc tải đầy đủ trước khi chia trang cục bộ.

## Icon

Toàn bộ icon giao diện dùng `lucide-react` qua component `Icon.tsx`.
Thêm icon bằng named import và ánh xạ tên trong component này, không tự viết
SVG path hoặc dùng ký tự làm icon. Chỉ import icon cần dùng, không import toàn
bộ thư viện hoặc dùng dynamic icon loader.

```tsx
<Icon name="save" />
<Icon name="loader" className="icon-spin" />
```

Icon mặc định là trang trí (`aria-hidden`); nút chỉ chứa icon cần có
`aria-label` tiếng Việt. Với icon mang thông tin độc lập, truyền `aria-label`
và `role="img"`. Có thể truyền props của Lucide như `strokeWidth`, `size`,
`className`; kích thước bố cục hiện được quy định bởi lớp `.ui-icon` và CSS
theo vị trí. Logo thương hiệu dùng `<Icon name="leaf" />` kết hợp chữ
MyCropDiary, không cần file ảnh riêng.

Tài liệu: https://lucide.dev/guide/react
