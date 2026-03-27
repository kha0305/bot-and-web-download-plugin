# Hướng Dẫn Tùy Chỉnh Giao Diện Discord Bot

## Mục Lục

1. [Màu Nút Bấm (Buttons)](#1-màu-nút-bấm-buttons)
2. [Màu Embed](#2-màu-embed)
3. [Vị Trí File Cần Sửa](#3-vị-trí-file-cần-sửa)
4. [Ví Dụ Đổi Màu](#4-ví-dụ-thực-tế)
5. [Tùy Chỉnh Vị Trí Nút](#5-tùy-chỉnh-vị-trí-nút)

---

## 1. Màu Nút Bấm (Buttons)

### Giới hạn của Discord

Discord **KHÔNG cho phép** tùy chỉnh màu nút theo ý muốn. Chỉ có **4 màu cố định**:

| Style                   | Màu         | Preview |
| ----------------------- | ----------- | ------- |
| `ButtonStyle.Primary`   | Tím/Blurple | 🟣      |
| `ButtonStyle.Secondary` | Xám         | ⚫      |
| `ButtonStyle.Success`   | Xanh lá     | 🟢      |
| `ButtonStyle.Danger`    | Đỏ          | 🔴      |

### Cú pháp:

```javascript
const { ButtonBuilder, ButtonStyle } = require("discord.js");

const myButton = new ButtonBuilder()
  .setCustomId("my_button_id")
  .setLabel("Tên nút")
  .setEmoji("🔥")
  .setStyle(ButtonStyle.Success); // ← Đổi màu ở đây
```

### Các giá trị ButtonStyle:

```javascript
ButtonStyle.Primary; // = 1 (Tím)
ButtonStyle.Secondary; // = 2 (Xám)
ButtonStyle.Success; // = 3 (Xanh lá)
ButtonStyle.Danger; // = 4 (Đỏ)
ButtonStyle.Link; // = 5 (Xám, dùng cho URL)
```

---

## 2. Màu Embed

### Embed CÓ THỂ tùy chỉnh màu tự do!

Embed sử dụng mã màu HEX (không có dấu #, thêm 0x phía trước).

### Cú pháp:

```javascript
const { EmbedBuilder } = require("discord.js");

const embed = new EmbedBuilder()
  .setColor(0xff5733) // ← Màu cam
  .setTitle("Tiêu đề")
  .setDescription("Nội dung");
```

### Bảng màu phổ biến:

| Màu             | Mã HEX    | Code                  |
| --------------- | --------- | --------------------- |
| Đen             | `#000000` | `.setColor(0x000000)` |
| Trắng           | `#FFFFFF` | `.setColor(0xFFFFFF)` |
| Đỏ              | `#FF0000` | `.setColor(0xFF0000)` |
| Xanh lá         | `#00FF00` | `.setColor(0x00FF00)` |
| Xanh dương      | `#0099FF` | `.setColor(0x0099FF)` |
| Vàng            | `#FFFF00` | `.setColor(0xFFFF00)` |
| Cam             | `#FF5733` | `.setColor(0xFF5733)` |
| Tím             | `#9B59B6` | `.setColor(0x9B59B6)` |
| Hồng            | `#FF69B4` | `.setColor(0xFF69B4)` |
| Discord Dark    | `#2B2D31` | `.setColor(0x2B2D31)` |
| Discord Blurple | `#5865F2` | `.setColor(0x5865F2)` |

### Công cụ chọn màu:

- Google: Tìm "color picker" → Copy mã HEX → Bỏ dấu # → Thêm 0x
- Ví dụ: `#FF5733` → `0xFF5733`

---

## 3. Vị Trí File Cần Sửa

### Các file chứa màu sắc trong project:

| File                          | Nội dung                                 |
| ----------------------------- | ---------------------------------------- |
| `interactions/buttons.js`     | Màu nút trong menu Tiện ích, Download... |
| `commands/user/menu.js`       | Màu nút ở Dashboard chính                |
| `commands/user/download.js`   | Màu trong menu Download                  |
| `interactions/selectMenus.js` | Màu embed khi chọn plugin                |
| `interactions/modals.js`      | Màu embed kết quả dịch                   |

---

## 4. Ví Dụ Thực Tế

### Ví dụ 1: Đổi màu nút "Dịch File/Text" sang xanh lá

**File:** `interactions/buttons.js` (khoảng dòng 130)

```javascript
// TÌM:
const btnTranslate = new ButtonBuilder()
  .setCustomId("btn_translate_menu")
  .setLabel("Dịch File/Text")
  .setEmoji("🌐")
  .setStyle(ButtonStyle.Secondary); // Xám

// ĐỔI THÀNH:
const btnTranslate = new ButtonBuilder()
  .setCustomId("btn_translate_menu")
  .setLabel("Dịch File/Text")
  .setEmoji("🌐")
  .setStyle(ButtonStyle.Success); // Xanh lá
```

### Ví dụ 2: Đổi màu embed menu Tiện ích sang xanh dương

**File:** `interactions/buttons.js` (khoảng dòng 125)

```javascript
// TÌM:
const embed = new EmbedBuilder()
  .setColor(0x000000) // Đen
  .setTitle("🛠️ Tiện ích");

// ĐỔI THÀNH:
const embed = new EmbedBuilder()
  .setColor(0x0099ff) // Xanh dương
  .setTitle("🛠️ Tiện ích");
```

### Ví dụ 3: Đổi màu Dashboard chính sang gradient đỏ

**File:** `commands/user/menu.js` (khoảng dòng 46)

```javascript
// TÌM:
const embed = new EmbedBuilder().setColor(0x0099ff);

// ĐỔI THÀNH:
const embed = new EmbedBuilder().setColor(0xff4500); // Cam đỏ (OrangeRed)
```

---

## 5. Tùy Chỉnh Vị Trí Nút

### Cấu trúc Layout Discord

Discord cho phép tối đa **5 hàng (rows)**, mỗi hàng tối đa **5 nút**.

```
┌─────────────────────────────────────────────────────┐
│  Row 1:  [Nút 1]  [Nút 2]  [Nút 3]  [Nút 4]  [Nút 5]  │
├─────────────────────────────────────────────────────┤
│  Row 2:  [Nút 1]  [Nút 2]  ...                       │
├─────────────────────────────────────────────────────┤
│  Row 3:  ...                                         │
├─────────────────────────────────────────────────────┤
│  Row 4:  ...                                         │
├─────────────────────────────────────────────────────┤
│  Row 5:  ...                                         │
└─────────────────────────────────────────────────────┘
```

### Cách hoạt động

**Bước 1:** Tạo các nút (ButtonBuilder)

```javascript
const btnA = new ButtonBuilder()
  .setCustomId("btn_a")
  .setLabel("Nút A")
  .setStyle(ButtonStyle.Primary);

const btnB = new ButtonBuilder()
  .setCustomId("btn_b")
  .setLabel("Nút B")
  .setStyle(ButtonStyle.Success);

const btnC = new ButtonBuilder()
  .setCustomId("btn_c")
  .setLabel("Nút C")
  .setStyle(ButtonStyle.Danger);
```

**Bước 2:** Tạo các hàng (ActionRowBuilder) và thêm nút vào

```javascript
// Hàng 1 chứa nút A và B
const row1 = new ActionRowBuilder().addComponents(btnA, btnB);

// Hàng 2 chứa nút C
const row2 = new ActionRowBuilder().addComponents(btnC);
```

**Bước 3:** Gửi message với các hàng

```javascript
await interaction.reply({
  content: "Đây là các nút:",
  components: [row1, row2], // ← Thứ tự hàng từ trên xuống
});
```

### Vị trí file cần sửa cho Menu chính

**File:** `commands/user/menu.js`

```javascript
// Tìm đoạn code này (khoảng dòng 112-118):

const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);
const row2 = new ActionRowBuilder().addComponents(
  btnUserInfo,
  btnStatus,
  btnGuide
);
const row3 = new ActionRowBuilder().addComponents(btnRequest, btnReport);

await interaction.reply({
  embeds: [embed],
  components: [row1, row2, row3], // ← Thứ tự hiển thị
});
```

### Ví dụ: Đổi vị trí nút

**Trước (hiện tại):**

```
Row 1: [Download] [Tiện ích]
Row 2: [Thông tin] [Status] [Hướng dẫn]
Row 3: [Yêu cầu] [Báo lỗi]
```

**Muốn đổi thành:**

```
Row 1: [Download] [Tiện ích] [Hướng dẫn]
Row 2: [Yêu cầu] [Báo lỗi]
Row 3: [Thông tin] [Status]
```

**Code:**

```javascript
// Đổi từ:
const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);
const row2 = new ActionRowBuilder().addComponents(
  btnUserInfo,
  btnStatus,
  btnGuide
);
const row3 = new ActionRowBuilder().addComponents(btnRequest, btnReport);

// Thành:
const row1 = new ActionRowBuilder().addComponents(
  btnDownload,
  btnUtilities,
  btnGuide
);
const row2 = new ActionRowBuilder().addComponents(btnRequest, btnReport);
const row3 = new ActionRowBuilder().addComponents(btnUserInfo, btnStatus);
```

### Quy tắc quan trọng

1. **Mỗi hàng tối đa 5 nút**

   ```javascript
   // ✅ Đúng (5 nút)
   row.addComponents(btn1, btn2, btn3, btn4, btn5);

   // ❌ Sai (6 nút - sẽ lỗi!)
   row.addComponents(btn1, btn2, btn3, btn4, btn5, btn6);
   ```

2. **Tối đa 5 hàng mỗi message**

   ```javascript
   // ✅ Đúng (5 hàng)
   components: [row1, row2, row3, row4, row5];

   // ❌ Sai (6 hàng - sẽ lỗi!)
   components: [row1, row2, row3, row4, row5, row6];
   ```

3. **Thứ tự nút trong `.addComponents()` = thứ tự từ trái sang phải**

   ```javascript
   // Hiển thị: [A] [B] [C]
   row.addComponents(btnA, btnB, btnC);

   // Hiển thị: [C] [B] [A]
   row.addComponents(btnC, btnB, btnA);
   ```

4. **Thứ tự hàng trong `components: []` = thứ tự từ trên xuống**

   ```javascript
   // Row1 ở trên, Row2 ở dưới
   components: [row1, row2];

   // Row2 ở trên, Row1 ở dưới
   components: [row2, row1];
   ```

---

## Lưu Ý Quan Trọng

1. **Sau khi sửa file → PHẢI restart bot** để thấy thay đổi
2. Lệnh `/reload` chỉ reload folder `commands/`, KHÔNG reload `interactions/`
3. Để reload `interactions/`, phải restart bot hoàn toàn:

   ```bash
   # Dừng bot (Ctrl+C)
   node index.js
   ```

4. **Test màu trước khi deploy:**
   - Chạy bot local
   - Gõ `/menu` để xem thay đổi
   - Hài lòng rồi mới upload lên host

---

## Công Cụ Hữu Ích

- **Chọn màu HEX:** https://www.google.com/search?q=color+picker
- **Bảng màu Discord:** https://discord.com/branding
- **Discord.js Docs:** https://discord.js.org/docs/packages/discord.js/main/ButtonStyle:enum

---

## _Tài liệu được tạo bởi Antigravity AI_

## 1. Màu Nút Bấm (Buttons)

### ⚠️ Giới hạn của Discord

Discord **KHÔNG cho phép** tùy chỉnh màu nút theo ý muốn. Chỉ có **4 màu cố định**:

| Style                   | Màu         | Preview |
| ----------------------- | ----------- | ------- |
| `ButtonStyle.Primary`   | Tím/Blurple | 🟣      |
| `ButtonStyle.Secondary` | Xám         | ⚫      |
| `ButtonStyle.Success`   | Xanh lá     | 🟢      |
| `ButtonStyle.Danger`    | Đỏ          | 🔴      |

### Cú pháp:

```javascript
const { ButtonBuilder, ButtonStyle } = require("discord.js");

const myButton = new ButtonBuilder()
  .setCustomId("my_button_id")
  .setLabel("Tên nút")
  .setEmoji("🔥")
  .setStyle(ButtonStyle.Success); // ← Đổi màu ở đây
```

### Các giá trị ButtonStyle:

```javascript
ButtonStyle.Primary; // = 1 (Tím)
ButtonStyle.Secondary; // = 2 (Xám)
ButtonStyle.Success; // = 3 (Xanh lá)
ButtonStyle.Danger; // = 4 (Đỏ)
ButtonStyle.Link; // = 5 (Xám, dùng cho URL)
```

---

## 2. Màu Embed

### ✅ Embed CÓ THỂ tùy chỉnh màu tự do!

Embed sử dụng mã màu HEX (không có dấu #, thêm 0x phía trước).

### Cú pháp:

```javascript
const { EmbedBuilder } = require("discord.js");

const embed = new EmbedBuilder()
  .setColor(0xff5733) // ← Màu cam
  .setTitle("Tiêu đề")
  .setDescription("Nội dung");
```

### Bảng màu phổ biến:

| Màu             | Mã HEX    | Code                  |
| --------------- | --------- | --------------------- |
| Đen             | `#000000` | `.setColor(0x000000)` |
| Trắng           | `#FFFFFF` | `.setColor(0xFFFFFF)` |
| Đỏ              | `#FF0000` | `.setColor(0xFF0000)` |
| Xanh lá         | `#00FF00` | `.setColor(0x00FF00)` |
| Xanh dương      | `#0099FF` | `.setColor(0x0099FF)` |
| Vàng            | `#FFFF00` | `.setColor(0xFFFF00)` |
| Cam             | `#FF5733` | `.setColor(0xFF5733)` |
| Tím             | `#9B59B6` | `.setColor(0x9B59B6)` |
| Hồng            | `#FF69B4` | `.setColor(0xFF69B4)` |
| Discord Dark    | `#2B2D31` | `.setColor(0x2B2D31)` |
| Discord Blurple | `#5865F2` | `.setColor(0x5865F2)` |

### Công cụ chọn màu:

- Google: Tìm "color picker" → Copy mã HEX → Bỏ dấu # → Thêm 0x
- Ví dụ: `#FF5733` → `0xFF5733`

---

## 3. Vị Trí File Cần Sửa

### Các file chứa màu sắc trong project:

| File                          | Nội dung                                 |
| ----------------------------- | ---------------------------------------- |
| `interactions/buttons.js`     | Màu nút trong menu Tiện ích, Download... |
| `commands/user/menu.js`       | Màu nút ở Dashboard chính                |
| `commands/user/download.js`   | Màu trong menu Download                  |
| `interactions/selectMenus.js` | Màu embed khi chọn plugin                |
| `interactions/modals.js`      | Màu embed kết quả dịch                   |

---

## 4. Ví Dụ Thực Tế

### Ví dụ 1: Đổi màu nút "Dịch File/Text" sang xanh lá

**File:** `interactions/buttons.js` (khoảng dòng 130)

```javascript
// TÌM:
const btnTranslate = new ButtonBuilder()
  .setCustomId("btn_translate_menu")
  .setLabel("Dịch File/Text")
  .setEmoji("🌐")
  .setStyle(ButtonStyle.Secondary); // Xám

// ĐỔI THÀNH:
const btnTranslate = new ButtonBuilder()
  .setCustomId("btn_translate_menu")
  .setLabel("Dịch File/Text")
  .setEmoji("🌐")
  .setStyle(ButtonStyle.Success); // Xanh lá
```

### Ví dụ 2: Đổi màu embed menu Tiện ích sang xanh dương

**File:** `interactions/buttons.js` (khoảng dòng 125)

```javascript
// TÌM:
const embed = new EmbedBuilder()
  .setColor(0x000000) // Đen
  .setTitle("🛠️ Tiện ích");

// ĐỔI THÀNH:
const embed = new EmbedBuilder()
  .setColor(0x0099ff) // Xanh dương
  .setTitle("🛠️ Tiện ích");
```

### Ví dụ 3: Đổi màu Dashboard chính sang gradient đỏ

**File:** `commands/user/menu.js` (khoảng dòng 46)

```javascript
// TÌM:
const embed = new EmbedBuilder().setColor(0x0099ff);

// ĐỔI THÀNH:
const embed = new EmbedBuilder().setColor(0xff4500); // Cam đỏ (OrangeRed)
```

---

## 5. Tùy Chỉnh Vị Trí Nút

### 📐 Cấu trúc Layout Discord

Discord cho phép tối đa **5 hàng (rows)**, mỗi hàng tối đa **5 nút**.

```
┌─────────────────────────────────────────────────────┐
│  Row 1:  [Nút 1]  [Nút 2]  [Nút 3]  [Nút 4]  [Nút 5]  │
├─────────────────────────────────────────────────────┤
│  Row 2:  [Nút 1]  [Nút 2]  ...                       │
├─────────────────────────────────────────────────────┤
│  Row 3:  ...                                         │
├─────────────────────────────────────────────────────┤
│  Row 4:  ...                                         │
├─────────────────────────────────────────────────────┤
│  Row 5:  ...                                         │
└─────────────────────────────────────────────────────┘
```

### 🔧 Cách hoạt động

**Bước 1:** Tạo các nút (ButtonBuilder)

```javascript
const btnA = new ButtonBuilder()
  .setCustomId("btn_a")
  .setLabel("Nút A")
  .setStyle(ButtonStyle.Primary);

const btnB = new ButtonBuilder()
  .setCustomId("btn_b")
  .setLabel("Nút B")
  .setStyle(ButtonStyle.Success);

const btnC = new ButtonBuilder()
  .setCustomId("btn_c")
  .setLabel("Nút C")
  .setStyle(ButtonStyle.Danger);
```

**Bước 2:** Tạo các hàng (ActionRowBuilder) và thêm nút vào

```javascript
// Hàng 1 chứa nút A và B
const row1 = new ActionRowBuilder().addComponents(btnA, btnB);

// Hàng 2 chứa nút C
const row2 = new ActionRowBuilder().addComponents(btnC);
```

**Bước 3:** Gửi message với các hàng

```javascript
await interaction.reply({
  content: "Đây là các nút:",
  components: [row1, row2], // ← Thứ tự hàng từ trên xuống
});
```

### 📍 Vị trí file cần sửa cho Menu chính

**File:** `commands/user/menu.js`

```javascript
// Tìm đoạn code này (khoảng dòng 112-118):

const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);
const row2 = new ActionRowBuilder().addComponents(
  btnUserInfo,
  btnStatus,
  btnGuide
);
const row3 = new ActionRowBuilder().addComponents(btnRequest, btnReport);

await interaction.reply({
  embeds: [embed],
  components: [row1, row2, row3], // ← Thứ tự hiển thị
});
```

### ✏️ Ví dụ: Đổi vị trí nút

**Trước (hiện tại):**

```
Row 1: [Download] [Tiện ích]
Row 2: [Thông tin] [Status] [Hướng dẫn]
Row 3: [Yêu cầu] [Báo lỗi]
```

**Muốn đổi thành:**

```
Row 1: [Download] [Tiện ích] [Hướng dẫn]
Row 2: [Yêu cầu] [Báo lỗi]
Row 3: [Thông tin] [Status]
```

**Code:**

```javascript
// Đổi từ:
const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);
const row2 = new ActionRowBuilder().addComponents(
  btnUserInfo,
  btnStatus,
  btnGuide
);
const row3 = new ActionRowBuilder().addComponents(btnRequest, btnReport);

// Thành:
const row1 = new ActionRowBuilder().addComponents(
  btnDownload,
  btnUtilities,
  btnGuide
);
const row2 = new ActionRowBuilder().addComponents(btnRequest, btnReport);
const row3 = new ActionRowBuilder().addComponents(btnUserInfo, btnStatus);
```

### ⚠️ Quy tắc quan trọng

1. **Mỗi hàng tối đa 5 nút**

   ```javascript
   // ✅ Đúng (5 nút)
   row.addComponents(btn1, btn2, btn3, btn4, btn5);

   // ❌ Sai (6 nút - sẽ lỗi!)
   row.addComponents(btn1, btn2, btn3, btn4, btn5, btn6);
   ```

2. **Tối đa 5 hàng mỗi message**

   ```javascript
   // ✅ Đúng
   components: [row1, row2, row3, row4, row5];

   // ❌ Sai (6 hàng - sẽ lỗi!)
   components: [row1, row2, row3, row4, row5, row6];
   ```

3. **Thứ tự nút trong `.addComponents()` = thứ tự từ trái sang phải**

   ```javascript
   // Hiển thị: [A] [B] [C]
   row.addComponents(btnA, btnB, btnC);

   // Hiển thị: [C] [B] [A]
   row.addComponents(btnC, btnB, btnA);
   ```

4. **Thứ tự hàng trong `components: []` = thứ tự từ trên xuống**

   ```javascript
   // Row1 ở trên, Row2 ở dưới
   components: [row1, row2];

   // Row2 ở trên, Row1 ở dưới
   components: [row2, row1];
   ```

---

## 📝 Lưu Ý Quan Trọng

1. **Sau khi sửa file → PHẢI restart bot** để thấy thay đổi
2. Lệnh `/reload` chỉ reload folder `commands/`, KHÔNG reload `interactions/`
3. Để reload `interactions/`, phải restart bot hoàn toàn:

   ```bash
   # Dừng bot (Ctrl+C)
   node index.js
   ```

4. **Test màu trước khi deploy:**
   - Chạy bot local
   - Gõ `/menu` để xem thay đổi
   - Hài lòng rồi mới upload lên host

---

## 🔧 Công Cụ Hữu Ích

- **Chọn màu HEX:** https://www.google.com/search?q=color+picker
- **Bảng màu Discord:** https://discord.com/branding
- **Discord.js Docs:** https://discord.js.org/docs/packages/discord.js/main/ButtonStyle:enum

---

_Tài liệu được tạo bởi Antigravity AI - 13/01/2026_
