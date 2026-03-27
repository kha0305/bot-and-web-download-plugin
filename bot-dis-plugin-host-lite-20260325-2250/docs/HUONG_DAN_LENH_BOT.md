# Hướng dẫn sử dụng lệnh Discord Bot

## Lệnh cho người dùng

### `/menu`

Mở menu chọn danh mục plugin.

**Cách dùng:**

1. Gõ `/menu` trong kênh Discord
2. Chọn danh mục từ dropdown
3. Click nút để xem plugin

---

### `/search <tên>`

Tìm kiếm plugin theo tên.

**Cú pháp:**

```
/search query:tên_plugin
```

**Ví dụ:**

```
/search query:CMI
/search query:Economy
```

---

### `/lookup [danh_mục]`

Tra cứu chi tiết các plugin trong danh mục.

**Cú pháp:**

```
/lookup category:tên_danh_mục
```

**Ví dụ:**

```
/lookup category:CMI
/lookup category:ItemsAdder
```

---

### `/favorites`

Quản lý plugin yêu thích.

**Chức năng:**

- Xem danh sách plugin đã yêu thích
- Thêm/xóa plugin khỏi danh sách

---

### `/history`

Xem lịch sử tải plugin.

**Chức năng:**

- Hiển thị các plugin đã tải gần đây
- Xóa lịch sử
- Xuất lịch sử

---

### `/rate <plugin> <điểm>`

Đánh giá plugin.

**Cú pháp:**

```
/rate plugin:tên_plugin stars:1-5
```

**Ví dụ:**

```
/rate plugin:CMI stars:5
```

---

## Lệnh cho Admin

### `/scan`

Quét và cập nhật database plugin.

**Chức năng:**

- Quét thư mục `data/files`
- Thêm plugin mới vào database
- Cập nhật thông tin plugin

**Lưu ý:** Chỉ Admin mới dùng được lệnh này.

---

### `/upload`

Upload plugin mới từ Discord.

**Cách dùng:**

1. Gõ `/upload`
2. Attach file `.jar` hoặc `.zip`
3. Điền thông tin plugin
4. Submit

---

### `/autoscan [khoảng_thời_gian]`

Cấu hình tự động quét.

**Cú pháp:**

```
/autoscan interval:30
/autoscan action:now
/autoscan action:stop
```

**Tham số:**

- `interval`: Số phút giữa các lần quét (mặc định 30)
- `action:now`: Quét ngay lập tức
- `action:stop`: Dừng tự động quét

---

### `/dashboard`

Gửi link Dashboard (nếu có).

---

### `/edit <plugin_id>`

Chỉnh sửa thông tin plugin.

**Chức năng:**

- Đổi tên plugin
- Sửa mô tả
- Cập nhật phiên bản

---

### `/delete <plugin_id>`

Xóa plugin khỏi database.

**Lưu ý:** File thực tế không bị xóa, chỉ xóa khỏi database.

---

## Button và Menu

### Nút tải xuống

- Click nút **"Tải xuống"** trên embed plugin
- Link tải sẽ được gửi qua DM

### Thêm yêu thích

- Click nút **"Yêu thích"** để thêm vào danh sách
- Click lại để xóa khỏi danh sách

### Phân trang

- Click **"◀ Trước"** / **"Sau ▶"** để chuyển trang
- Hiển thị trang hiện tại / tổng số trang

---

## Quyền hạn

| Lệnh         | Người dùng | Admin |
| ------------ | ---------- | ----- |
| `/menu`      | Có         | Có    |
| `/search`    | Có         | Có    |
| `/lookup`    | Có         | Có    |
| `/favorites` | Có         | Có    |
| `/history`   | Có         | Có    |
| `/rate`      | Có         | Có    |
| `/scan`      | Không      | Có    |
| `/upload`    | Không      | Có    |
| `/autoscan`  | Không      | Có    |
| `/edit`      | Không      | Có    |
| `/delete`    | Không      | Có    |

---

## Xử lý lỗi

### "Không tìm thấy plugin"

- Kiểm tra chính tả
- Thử tìm với từ khóa ngắn hơn

### "Bạn không có quyền"

- Lệnh yêu cầu quyền Admin
- Liên hệ Admin để được cấp quyền

### "Bot không phản hồi"

- Kiểm tra bot có online không
- Thử lại sau vài giây
