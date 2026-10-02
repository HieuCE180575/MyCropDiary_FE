# Shared components

Đặt các UI dùng lại nhiều nơi tại đây: Button, Input, Modal, DataTable, Pagination,
StatusBadge, ConfirmDialog và EmptyState. Không đặt nghiệp vụ riêng của một module vào đây.

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
