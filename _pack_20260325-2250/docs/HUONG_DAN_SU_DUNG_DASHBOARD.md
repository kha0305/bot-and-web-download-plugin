# Hướng dẫn sử dụng Dashboard

## Giới thiệu

Dashboard là giao diện web giúp Admin quản lý kho plugin Minecraft một cách trực quan và dễ dàng hơn so với sử dụng lệnh Discord.

## Truy cập Dashboard

### URL:

- **Local:** http://localhost:26012
- **Hosting:** http://stardust.pikamc.vn:26012
- **Web tải public:** `/downloads` (ví dụ: `http://localhost:26012/downloads`)

### Đăng nhập:

1. Truy cập URL dashboard
2. Nhập **Discord ID** của Admin
3. Click **Đăng nhập**

> **Lưu ý:** Chỉ có Discord ID được cấu hình trong `.env` (ADMIN_ID) mới có quyền đăng nhập.

---

## Các trang chính

### 1. Trang chủ (`/home`)

Hiển thị tổng quan:

- **Tổng số plugin** - Số lượng plugin trong database
- **Tổng lượt tải** - Số lần người dùng download plugin
- **Người dùng** - Số user đã sử dụng bot
- **Tải hôm nay** - Lượt download trong 24h qua

**Biểu đồ:**

- Lượt tải theo thời gian (có thể lọc 1 ngày/1 tuần/1 tháng/1 năm)
- Phân bố danh mục plugin

**Bảng xếp hạng:**

- Top 10 plugin được tải nhiều nhất

---

### 2. Kho lưu trữ (`/storage`)

Quản lý file plugin:

**Upload file:**

- Kéo thả file `.jar` hoặc `.zip` vào vùng upload
- Hoặc click nút "Tải lên" để chọn file

**Quản lý file:**

- **Xem:** Click vào thư mục bên trái
- **Sắp xếp:** Theo tên / Dung lượng / Thời gian
- **Đổi tên:** Click icon bút chì
- **Tải xuống:** Double-click hoặc click icon download
- **Xóa:** Click icon thùng rác (có xác nhận)
- **Di chuyển:** Chọn file (Ctrl+Click) → Click "Di chuyển"

**Tạo thư mục mới:**

- Click nút "Tạo thư mục"
- Nhập tên → Click "Tạo"

---

### 3. Thống kê (`/statistics`)

Báo cáo chi tiết:

**Lọc thời gian:**

- 1 Ngày / 1 Tuần / 1 Tháng / 1 Năm / Tất cả

**Thống kê:**

- Lượt tải trong kỳ
- Trung bình mỗi ngày
- Plugin phổ biến nhất
- Ngày cao điểm

**Xuất báo cáo:**

- **JSON:** Dữ liệu đầy đủ, dùng để backup
- **CSV:** Dạng bảng, mở được bằng Excel

**Lịch sử chi tiết:**

- Bảng hiển thị từng lượt tải
- Có tìm kiếm theo tên plugin
- Phân trang 50 bản ghi/trang

---

### 4. Hướng dẫn (`/guide`)

Trang hướng dẫn sử dụng nhanh với:

- Bắt đầu nhanh
- Cách upload plugin
- Quản lý file
- Lệnh Discord Bot
- Phím tắt

---

## Web tải công khai (`/downloads`)

Trang này không cần đăng nhập, dành cho người dùng chỉ cần tải file:

- Tìm kiếm theo tên plugin hoặc tên file
- Lọc theo danh mục
- Phân trang danh sách phiên bản
- Tải trực tiếp bằng nút "Tải xuống"
- Có tab **Dịch Minecraft** để dịch text hoặc file `.yml/.yaml/.txt` trực tiếp trên web

API public đi kèm:

- `GET /api/public/categories`
- `GET /api/public/plugins`
- `GET /api/public/download/:pluginId`
- `GET /api/public/translate/meta`
- `POST /api/public/translate/text` (`engine`, `skill`, `text`)
- `POST /api/public/translate/file` (`engine`, `skill`, `file`)

---

## Phím tắt

| Phím           | Chức năng            |
| -------------- | -------------------- |
| `Ctrl + Click` | Chọn nhiều file      |
| `Double Click` | Tải xuống file       |
| `Enter`        | Xác nhận trong modal |
| `Escape`       | Đóng modal           |

---

## Lưu ý

1. **Session:** Phiên đăng nhập hết hạn sau 24 giờ
2. **File size:** Giới hạn upload 100MB/file
3. **Định dạng:** Chỉ hỗ trợ `.jar` và `.zip`
4. **Auto-save:** Mọi thay đổi được lưu tự động

---

## Xử lý lỗi thường gặp

### Không đăng nhập được

- Kiểm tra Discord ID có đúng không
- Xác nhận ADMIN_ID trong file `.env`

### Upload thất bại

- Kiểm tra định dạng file (.jar hoặc .zip)
- Kiểm tra dung lượng file (<100MB)

### Trang bị lỗi

- Refresh lại trang (F5)
- Xóa cache trình duyệt
- Restart bot
