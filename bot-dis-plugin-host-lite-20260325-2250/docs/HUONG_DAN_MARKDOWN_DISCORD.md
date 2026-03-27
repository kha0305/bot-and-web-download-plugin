# 📝 Hướng dẫn Định dạng Văn bản trong Discord

Discord hỗ trợ **Markdown** - một hệ thống định dạng văn bản đơn giản. Dưới đây là hướng dẫn chi tiết cách sử dụng.

---

## 📋 Mục lục

1. [Định dạng cơ bản](#định-dạng-cơ-bản)
2. [Kết hợp định dạng](#kết-hợp-định-dạng)
3. [Code và khối code](#code-và-khối-code)
4. [Trích dẫn](#trích-dẫn)
5. [Spoiler](#spoiler)
6. [Liên kết](#liên-kết)
7. [Danh sách](#danh-sách)
8. [Tiêu đề](#tiêu-đề)
9. [Gạch ngang](#gạch-ngang)
10. [Mention và Emoji](#mention-và-emoji)
11. [Timestamp](#timestamp)

---

## ✨ Định dạng cơ bản

### In đậm (Bold)

Dùng **2 dấu sao** `**` ở hai bên văn bản:

```
**Văn bản in đậm**
```

Kết quả: **Văn bản in đậm**

---

### In nghiêng (Italic)

Dùng **1 dấu sao** `*` hoặc **1 dấu gạch dưới** `_` ở hai bên:

```
*Văn bản in nghiêng*
_Văn bản in nghiêng_
```

Kết quả: _Văn bản in nghiêng_

---

### Gạch chân (Underline)

Dùng **2 dấu gạch dưới** `__` ở hai bên:

```
__Văn bản gạch chân__
```

Kết quả: **Văn bản gạch chân**

---

### Gạch ngang (Strikethrough)

Dùng **2 dấu ngã** `~~` ở hai bên:

```
~~Văn bản gạch ngang~~
```

Kết quả: ~~Văn bản gạch ngang~~

---

## 🔗 Kết hợp định dạng

Bạn có thể kết hợp nhiều định dạng cùng lúc:

```
***In đậm và nghiêng***
**_In đậm và nghiêng_**
__*Gạch chân và nghiêng*__
__**Gạch chân và đậm**__
~~**Gạch ngang và đậm**~~
***__Đậm, nghiêng và gạch chân__***
```

---

## 💻 Code và Khối Code

### Code inline (trong dòng)

Dùng **1 dấu backtick** `` ` `` ở hai bên:

```
`code inline`
```

Kết quả: `code inline`

---

### Khối code (nhiều dòng)

Dùng **3 dấu backtick** ``` ở đầu và cuối:

````
```
Đây là khối code
nhiều dòng
```
````

---

### Khối code có syntax highlighting

Thêm tên ngôn ngữ sau 3 backtick đầu tiên:

````
```javascript
const message = "Hello World!";
console.log(message);
```
````

**Các ngôn ngữ phổ biến:**

- `javascript` hoặc `js`
- `python` hoặc `py`
- `java`
- `html`
- `css`
- `json`
- `yaml`
- `bash` hoặc `sh`
- `sql`
- `diff`

---

## 💬 Trích dẫn (Quote)

### Trích dẫn 1 dòng

Dùng **dấu >** ở đầu dòng:

```
> Đây là trích dẫn
```

Kết quả:

> Đây là trích dẫn

---

### Trích dẫn nhiều dòng

Dùng **3 dấu >** `>>>` để trích dẫn tất cả phía sau:

```
>>> Đây là trích dẫn
nhiều dòng
tất cả đều được trích dẫn
```

---

## 🙈 Spoiler

Dùng **2 dấu ||** ở hai bên để ẩn nội dung:

```
||Nội dung spoiler||
```

Người xem phải click vào để xem nội dung.

---

## 🔗 Liên kết

### Liên kết tự động

Discord tự động nhận diện URL:

```
https://discord.com
```

---

### Liên kết có nhãn (Masked Link)

Dùng cú pháp Markdown:

```
[Nhãn hiển thị](https://discord.com)
```

Kết quả: [Nhãn hiển thị](https://discord.com)

---

### Ẩn preview liên kết

Bọc URL trong dấu `< >`:

```
<https://discord.com>
```

---

## 📋 Danh sách

### Danh sách không thứ tự

Dùng dấu `-` hoặc `*` ở đầu dòng:

```
- Mục 1
- Mục 2
- Mục 3
```

---

### Danh sách có thứ tự

Dùng số theo sau bởi dấu `.`:

```
1. Mục đầu tiên
2. Mục thứ hai
3. Mục thứ ba
```

---

## 📌 Tiêu đề

Dùng dấu `#` ở đầu dòng (chỉ hoạt động trong Embed):

```
# Tiêu đề lớn
## Tiêu đề vừa
### Tiêu đề nhỏ
```

---

## ➖ Gạch ngang (Divider)

Hiện tại Discord không hỗ trợ `---` như Markdown thông thường.

---

## 👤 Mention và Emoji

### Mention người dùng

```
<@USER_ID>
```

Ví dụ: `<@123456789012345678>`

---

### Mention Role

```
<@&ROLE_ID>
```

---

### Mention Channel

```
<#CHANNEL_ID>
```

---

### Emoji tùy chỉnh

```
<:emoji_name:EMOJI_ID>
```

Hoặc emoji động:

```
<a:emoji_name:EMOJI_ID>
```

---

## ⏰ Timestamp

Discord hỗ trợ timestamp động:

```
<t:UNIX_TIMESTAMP>
<t:UNIX_TIMESTAMP:STYLE>
```

**Các style:**

| Style | Kết quả ví dụ                  |
| ----- | ------------------------------ |
| `t`   | 16:20                          |
| `T`   | 16:20:30                       |
| `d`   | 20/01/2026                     |
| `D`   | 20 tháng 1, 2026               |
| `f`   | 20 tháng 1, 2026 16:20         |
| `F`   | Thứ Ba, 20 tháng 1, 2026 16:20 |
| `R`   | 2 giờ trước                    |

**Ví dụ:**

```
<t:1705752000:R>
```

---

## 📊 Bảng tổng hợp

| Định dạng   | Cú pháp                | Kết quả          |
| ----------- | ---------------------- | ---------------- |
| In đậm      | `**text**`             | **text**         |
| In nghiêng  | `*text*` hoặc `_text_` | _text_           |
| Gạch chân   | `__text__`             | text (gạch chân) |
| Gạch ngang  | `~~text~~`             | ~~text~~         |
| Spoiler     | `\|\|text\|\|`         | (ẩn)             |
| Code inline | `` `code` ``           | `code`           |
| Trích dẫn   | `> text`               | (quote)          |

---

## 💡 Mẹo hữu ích

1. **Escape ký tự đặc biệt**: Dùng `\` trước ký tự để hiển thị nguyên bản
   - `\*không in nghiêng\*` → \*không in nghiêng\*

2. **Xem raw message**: Click chuột phải vào tin nhắn → "Copy Message Link" hoặc "Edit" để xem cú pháp gốc

3. **Preview trước khi gửi**: Discord hiển thị preview real-time khi bạn đang gõ

4. **Shift + Enter**: Xuống dòng mà không gửi tin nhắn

---

_Cập nhật: Tháng 1, 2026_
