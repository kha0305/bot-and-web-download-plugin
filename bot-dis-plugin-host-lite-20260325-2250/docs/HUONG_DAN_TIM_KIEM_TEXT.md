# 🔍 Hướng dẫn Tìm kiếm Plugin bằng Text

Tính năng này cho phép người dùng **chat tên plugin** trong kênh Discord và bot sẽ tự động đề xuất các plugin phù hợp.

---

## 📋 Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Cách thiết lập](#cách-thiết-lập)
3. [Cách sử dụng](#cách-sử-dụng)
4. [Các lệnh quản lý](#các-lệnh-quản-lý)
5. [Cấu hình nâng cao](#cấu-hình-nâng-cao)
6. [FAQ](#faq)

---

## 🎯 Giới thiệu

### Tính năng hoạt động như thế nào?

1. **Người dùng** chat tên plugin trong kênh Discord (ví dụ: "CMI", "ItemsAdder")
2. **Bot** tự động tìm kiếm trong database
3. **Bot** reply với danh sách plugin phù hợp + buttons download
4. **Người dùng** click button để tải plugin
5. **Tin nhắn** tự động xóa sau 30 giây

### Ưu điểm

- ✅ Tìm kiếm nhanh chóng, không cần dùng lệnh
- ✅ Hiển thị nhiều phiên bản cùng lúc
- ✅ Download trực tiếp bằng button
- ✅ Không spam kênh (tự động xóa)
- ✅ Chỉ hoạt động trong kênh được cho phép

---

## ⚙️ Cách thiết lập

### Bước 1: Vào kênh muốn bật tính năng

Chọn kênh Discord mà bạn muốn cho phép người dùng tìm kiếm plugin.

### Bước 2: Chạy lệnh thiết lập

```
/textsearch setchannel
```

Bot sẽ ghi nhớ kênh này và chỉ hoạt động trong kênh đó.

### Bước 3: Xác nhận

Kiểm tra trạng thái:

```
/textsearch status
```

Nếu thấy kênh hiển thị trong "Kênh cho phép" là đã thành công!

---

## 💬 Cách sử dụng

### Cho người dùng thường

Trong kênh đã được cấu hình, chỉ cần **chat tên plugin**:

```
CMI
```

Bot sẽ tự động reply:

```
🔍 Tìm thấy 5 plugin
Kết quả tìm kiếm cho: CMI

🥇 CMI 9.8.2.4
🥈 CMI 9.8.2.3
🥉 CMI 9.8.2.2
📦 CMI 9.8.1.2
📦 CMI 9.8.0.5

[📥 CMI 9.8.2.4] [📥 CMI 9.8.2.3] [📥 CMI 9.8.2.2] ...
```

Click button để tải plugin mong muốn.

### Lưu ý

- Tin nhắn tìm kiếm phải có **ít nhất 3 ký tự**
- Không bắt đầu bằng `/` hoặc `!` (được coi là lệnh)
- Có **cooldown 5 giây** giữa các lần tìm kiếm
- Tin nhắn kết quả **tự động xóa sau 30 giây**

---

## 🛠️ Các lệnh quản lý

> **Lưu ý**: Tất cả lệnh yêu cầu quyền **Administrator**

### Xem trạng thái

```
/textsearch status
```

Hiển thị cấu hình hiện tại: trạng thái bật/tắt, kênh cho phép, số kết quả tối đa, v.v.

### Bật/tắt tính năng

```
/textsearch toggle enabled:true
/textsearch toggle enabled:false
```

### Đặt kênh hiện tại làm kênh tìm kiếm

```
/textsearch setchannel
```

Xóa tất cả kênh cũ và chỉ cho phép kênh hiện tại.

### Thêm kênh vào danh sách

```
/textsearch addchannel channel:#tên-kênh
```

Thêm một kênh mới vào danh sách cho phép (giữ nguyên các kênh cũ).

### Xóa kênh khỏi danh sách

```
/textsearch removechannel channel:#tên-kênh
```

### Xóa tất cả kênh

```
/textsearch clearallchannels
```

> ⚠️ **Cảnh báo**: Sau khi xóa tất cả kênh, tính năng sẽ không hoạt động cho đến khi bạn thêm kênh mới.

---

## 🔧 Cấu hình nâng cao

### Thay đổi số kết quả tối đa

```
/textsearch config maxresults:10
```

Giá trị từ 1-10. Mặc định là 5.

### Thay đổi độ dài tối thiểu của query

```
/textsearch config minlength:4
```

Giá trị từ 2-10. Mặc định là 3.

### Ví dụ cấu hình nhiều thông số

```
/textsearch config maxresults:7 minlength:2
```

---

## ❓ FAQ

### 1. Tại sao bot không phản hồi khi tôi chat tên plugin?

Kiểm tra các điều kiện sau:

- Kênh đã được thêm vào danh sách cho phép chưa?
- Tính năng có đang bật không? (`/textsearch status`)
- Tin nhắn có ít nhất 3 ký tự không?
- Bạn có đang trong thời gian cooldown không?

### 2. Có thể cho phép nhiều kênh không?

Có! Sử dụng `/textsearch addchannel` để thêm nhiều kênh.

### 3. Tin nhắn kết quả có tự động xóa không?

Có, mặc định là 30 giây. Điều này giúp kênh không bị spam.

### 4. Bot có phản hồi tin nhắn của bot khác không?

Không, bot bỏ qua tất cả tin nhắn từ bot.

### 5. Người dùng thường có thể tắt tính năng này không?

Không, chỉ Administrator mới có quyền quản lý tính năng này.

---

## 📊 Sơ đồ hoạt động

```
┌─────────────────────────────────────────────────────────┐
│  User chat: "ItemsAdder"                                │
│              ↓                                          │
│  Bot kiểm tra:                                          │
│  ✓ Tính năng đang bật?                                  │
│  ✓ Kênh này có trong danh sách cho phép?                │
│  ✓ Độ dài >= 3 ký tự?                                   │
│  ✓ Không phải lệnh (/ hoặc !)?                          │
│  ✓ User chưa bị cooldown (5 giây)?                      │
│              ↓                                          │
│  Bot tìm kiếm trong database plugins.json               │
│              ↓                                          │
│  Nếu có kết quả → Reply với embed + buttons download    │
│  Nếu không có → Im lặng (không làm gì)                  │
│              ↓                                          │
│  User click button → Nhận file plugin                   │
│              ↓                                          │
│  Tin nhắn tự động xóa sau 30 giây                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 Bảo mật

- Tính năng **chỉ hoạt động** trong kênh được admin cấu hình
- Các kênh khác bot **hoàn toàn im lặng**
- Có cooldown để **tránh spam**
- Chỉ **Administrator** mới có quyền quản lý

---

_Cập nhật lần cuối: Tháng 1, 2026_
