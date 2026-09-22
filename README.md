# MyCropDiary Frontend

Khung React 19 + TypeScript + Vite, chia module theo các Use Case MyCropDiary.

## Cấu trúc

```text
src
├── app
│   ├── layouts
│   └── routes
├── features
│   ├── auth
│   ├── farm-management
│   ├── production
│   ├── operations
│   ├── compliance
│   ├── reports
│   ├── ai
│   └── admin
├── pages
├── shared
│   ├── api
│   ├── components
│   ├── hooks
│   └── types
└── styles
```

Mỗi feature nên phát triển tiếp theo cấu trúc:

```text
feature-name/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
└── index.ts
```

## Chạy dự án

Yêu cầu Node.js 22.12 trở lên.

```bash
cp .env.example .env
npm install
npm run dev
```

Ứng dụng: `http://localhost:5173`  
Backend mặc định: `http://localhost:8080/api/v1`

## Phần đã dựng

- App shell, sidebar, dashboard responsive.
- Router và placeholder cho 19 module UC.
- HTTP client có vị trí gắn bearer token.
- Kiểu dữ liệu API và role cơ bản.
- Cấu trúc feature để team chia việc độc lập.

## Phần cần làm tiếp

- Auth state và JWT refresh token.
- Route guard theo SystemRole, FarmRole và ProductionArea assignment.
- Form validation, query cache, data table, upload evidence.
- Màn hình CRUD và tích hợp từng API.
- Không hiển thị hoặc gửi context ngoài phạm vi farm được cấp quyền cho AI.
