# Hướng Dẫn Tùy Chỉnh Vị Trí Nút Discord Bot

## Mục Lục

1. [Cấu Trúc Layout Discord](#1-cấu-trúc-layout-discord)
2. [Cách Hoạt Động](#2-cách-hoạt-động)
3. [Vị Trí File Cần Sửa](#3-vị-trí-file-cần-sửa)
4. [Ví Dụ Thực Tế](#4-ví-dụ-thực-tế)
5. [Quy Tắc Quan Trọng](#5-quy-tắc-quan-trọng)

---

## 1. Cấu Trúc Layout Discord

### Giới hạn

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

### Tổng kết

- **Tối đa 5 hàng** mỗi message
- **Tối đa 5 nút** mỗi hàng
- **Tối đa 25 nút** mỗi message (5 x 5)

---

## 2. Cách Hoạt Động

### Bước 1: Tạo các nút (ButtonBuilder)

```javascript
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

// Tạo nút A
const btnA = new ButtonBuilder()
  .setCustomId("btn_a")
  .setLabel("Nút A")
  .setEmoji("🅰️")
  .setStyle(ButtonStyle.Primary);

// Tạo nút B
const btnB = new ButtonBuilder()
  .setCustomId("btn_b")
  .setLabel("Nút B")
  .setEmoji("🅱️")
  .setStyle(ButtonStyle.Success);

// Tạo nút C
const btnC = new ButtonBuilder()
  .setCustomId("btn_c")
  .setLabel("Nút C")
  .setEmoji("©️")
  .setStyle(ButtonStyle.Danger);
```

### Bước 2: Tạo các hàng (ActionRowBuilder) và thêm nút vào

```javascript
// Hàng 1 chứa nút A và B
const row1 = new ActionRowBuilder().addComponents(btnA, btnB);

// Hàng 2 chứa nút C
const row2 = new ActionRowBuilder().addComponents(btnC);
```

### Bước 3: Gửi message với các hàng

```javascript
await interaction.reply({
  content: "Đây là các nút:",
  components: [row1, row2], // ← Thứ tự hàng từ trên xuống
});
```

### Kết quả hiển thị:

```
┌─────────────────────────┐
│  [🅰️ Nút A] [🅱️ Nút B]  │  ← row1
├─────────────────────────┤
│  [©️ Nút C]              │  ← row2
└─────────────────────────┘
```

---

## 3. Vị Trí File Cần Sửa

### Các file chứa layout nút:

| File                        | Nội dung                  | Dòng     |
| --------------------------- | ------------------------- | -------- |
| `commands/user/menu.js`     | Menu chính `/menu`        | ~112-118 |
| `interactions/buttons.js`   | Menu Tiện ích, Dịch, v.v. | ~148-152 |
| `commands/user/download.js` | Menu Download             | ~155-156 |

---

## 4. Ví Dụ Thực Tế

### Ví dụ 1: Sắp xếp lại Menu chính

**File:** `commands/user/menu.js`

**Layout hiện tại:**

```
Row 1: [Download] [Tiện ích]
Row 2: [Thông tin] [Status] [Hướng dẫn]
Row 3: [Yêu cầu] [Báo lỗi]
```

**Code hiện tại:**

```javascript
const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);
const row2 = new ActionRowBuilder().addComponents(
  btnUserInfo,
  btnStatus,
  btnGuide
);
const row3 = new ActionRowBuilder().addComponents(btnRequest, btnReport);

components: [row1, row2, row3];
```

---

**Muốn đổi thành:**

```
Row 1: [Download] [Tiện ích] [Hướng dẫn]
Row 2: [Yêu cầu] [Báo lỗi]
Row 3: [Thông tin] [Status]
```

**Code mới:**

```javascript
const row1 = new ActionRowBuilder().addComponents(
  btnDownload,
  btnUtilities,
  btnGuide
);
const row2 = new ActionRowBuilder().addComponents(btnRequest, btnReport);
const row3 = new ActionRowBuilder().addComponents(btnUserInfo, btnStatus);

components: [row1, row2, row3];
```

---

### Ví dụ 2: Đưa tất cả nút vào 1 hàng

**Muốn:**

```
Row 1: [Download] [Tiện ích] [Hướng dẫn] [Yêu cầu] [Báo lỗi]
Row 2: [Thông tin] [Status]
```

**Code:**

```javascript
const row1 = new ActionRowBuilder().addComponents(
  btnDownload,
  btnUtilities,
  btnGuide,
  btnRequest,
  btnReport
);
const row2 = new ActionRowBuilder().addComponents(btnUserInfo, btnStatus);

components: [row1, row2];
```

---

### Ví dụ 3: Đổi thứ tự nút trong hàng

**Trước:** `[Download] [Tiện ích]`
**Sau:** `[Tiện ích] [Download]`

**Code:**

```javascript
// Trước
const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);

// Sau - chỉ cần đổi thứ tự
const row1 = new ActionRowBuilder().addComponents(btnUtilities, btnDownload);
```

---

### Ví dụ 4: Đổi thứ tự hàng

**Trước:**

```
Row 1: [Download] [Tiện ích]
Row 2: [Yêu cầu] [Báo lỗi]
```

**Sau:**

```
Row 1: [Yêu cầu] [Báo lỗi]
Row 2: [Download] [Tiện ích]
```

**Code:**

```javascript
// Trước
components: [row1, row2];

// Sau - chỉ cần đổi thứ tự trong mảng
components: [row2, row1];
```

---

## 5. Quy Tắc Quan Trọng

### Quy tắc 1: Mỗi hàng tối đa 5 nút

```javascript
// ✅ Đúng (5 nút)
row.addComponents(btn1, btn2, btn3, btn4, btn5);

// ❌ Sai (6 nút - sẽ lỗi!)
row.addComponents(btn1, btn2, btn3, btn4, btn5, btn6);
// Error: ActionRow cannot have more than 5 components
```

### Quy tắc 2: Tối đa 5 hàng mỗi message

```javascript
// ✅ Đúng (5 hàng)
components: [row1, row2, row3, row4, row5];

// ❌ Sai (6 hàng - sẽ lỗi!)
components: [row1, row2, row3, row4, row5, row6];
// Error: Message cannot have more than 5 ActionRows
```

### Quy tắc 3: Thứ tự trong addComponents = Trái → Phải

```javascript
// Hiển thị: [A] [B] [C] (trái sang phải)
row.addComponents(btnA, btnB, btnC);

// Hiển thị: [C] [B] [A]
row.addComponents(btnC, btnB, btnA);
```

### Quy tắc 4: Thứ tự trong components = Trên → Dưới

```javascript
// Row1 ở trên, Row2 ở dưới
components: [row1, row2];

// Row2 ở trên, Row1 ở dưới
components: [row2, row1];
```

### Quy tắc 5: Mỗi nút cần có CustomId duy nhất

```javascript
// ✅ Đúng - ID khác nhau
btnA.setCustomId("btn_download");
btnB.setCustomId("btn_utilities");

// ❌ Sai - ID trùng nhau sẽ gây xung đột!
btnA.setCustomId("my_button");
btnB.setCustomId("my_button");
```

---

## Lưu Ý Sau Khi Sửa

1. **Lưu file** (Ctrl+S)
2. **Restart bot** để thấy thay đổi:
   ```bash
   # Dừng bot (Ctrl+C)
   node index.js
   ```
3. **Test lại** bằng cách gõ `/menu` trong Discord

---

## Tham Khảo

- [Discord.js ActionRowBuilder](https://discord.js.org/docs/packages/discord.js/main/ActionRowBuilder:Class)
- [Discord.js ButtonBuilder](https://discord.js.org/docs/packages/discord.js/main/ButtonBuilder:Class)
- [Hướng dẫn đổi màu](./HUONG_DAN_DOI_MAU.md)

---

## _Tài liệu được tạo bởi Antigravity AI_

## 1. Cấu Trúc Layout Discord

### 📐 Giới hạn

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

### 🎯 Tổng kết

- **Tối đa 5 hàng** mỗi message
- **Tối đa 5 nút** mỗi hàng
- **Tối đa 25 nút** mỗi message (5 x 5)

---

## 2. Cách Hoạt Động

### Bước 1: Tạo các nút (ButtonBuilder)

```javascript
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

// Tạo nút A
const btnA = new ButtonBuilder()
  .setCustomId("btn_a")
  .setLabel("Nút A")
  .setEmoji("🅰️")
  .setStyle(ButtonStyle.Primary);

// Tạo nút B
const btnB = new ButtonBuilder()
  .setCustomId("btn_b")
  .setLabel("Nút B")
  .setEmoji("🅱️")
  .setStyle(ButtonStyle.Success);

// Tạo nút C
const btnC = new ButtonBuilder()
  .setCustomId("btn_c")
  .setLabel("Nút C")
  .setEmoji("©️")
  .setStyle(ButtonStyle.Danger);
```

### Bước 2: Tạo các hàng (ActionRowBuilder) và thêm nút vào

```javascript
// Hàng 1 chứa nút A và B
const row1 = new ActionRowBuilder().addComponents(btnA, btnB);

// Hàng 2 chứa nút C
const row2 = new ActionRowBuilder().addComponents(btnC);
```

### Bước 3: Gửi message với các hàng

```javascript
await interaction.reply({
  content: "Đây là các nút:",
  components: [row1, row2], // ← Thứ tự hàng từ trên xuống
});
```

### 🖼️ Kết quả hiển thị:

```
┌─────────────────────────┐
│  [🅰️ Nút A] [🅱️ Nút B]  │  ← row1
├─────────────────────────┤
│  [©️ Nút C]              │  ← row2
└─────────────────────────┘
```

---

## 3. Vị Trí File Cần Sửa

### 📂 Các file chứa layout nút:

| File                        | Nội dung                  | Dòng     |
| --------------------------- | ------------------------- | -------- |
| `commands/user/menu.js`     | Menu chính `/menu`        | ~112-118 |
| `interactions/buttons.js`   | Menu Tiện ích, Dịch, v.v. | ~148-152 |
| `commands/user/download.js` | Menu Download             | ~155-156 |

---

## 4. Ví Dụ Thực Tế

### 📍 Ví dụ 1: Sắp xếp lại Menu chính

**File:** `commands/user/menu.js`

**Layout hiện tại:**

```
Row 1: [Download] [Tiện ích]
Row 2: [Thông tin] [Status] [Hướng dẫn]
Row 3: [Yêu cầu] [Báo lỗi]
```

**Code hiện tại:**

```javascript
const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);
const row2 = new ActionRowBuilder().addComponents(
  btnUserInfo,
  btnStatus,
  btnGuide
);
const row3 = new ActionRowBuilder().addComponents(btnRequest, btnReport);

components: [row1, row2, row3];
```

---

**Muốn đổi thành:**

```
Row 1: [Download] [Tiện ích] [Hướng dẫn]
Row 2: [Yêu cầu] [Báo lỗi]
Row 3: [Thông tin] [Status]
```

**Code mới:**

```javascript
const row1 = new ActionRowBuilder().addComponents(
  btnDownload,
  btnUtilities,
  btnGuide
);
const row2 = new ActionRowBuilder().addComponents(btnRequest, btnReport);
const row3 = new ActionRowBuilder().addComponents(btnUserInfo, btnStatus);

components: [row1, row2, row3];
```

---

### 📍 Ví dụ 2: Đưa tất cả nút vào 1 hàng

**Muốn:**

```
Row 1: [Download] [Tiện ích] [Hướng dẫn] [Yêu cầu] [Báo lỗi]
Row 2: [Thông tin] [Status]
```

**Code:**

```javascript
const row1 = new ActionRowBuilder().addComponents(
  btnDownload,
  btnUtilities,
  btnGuide,
  btnRequest,
  btnReport
);
const row2 = new ActionRowBuilder().addComponents(btnUserInfo, btnStatus);

components: [row1, row2];
```

---

### 📍 Ví dụ 3: Đổi thứ tự nút trong hàng

**Trước:** `[Download] [Tiện ích]`
**Sau:** `[Tiện ích] [Download]`

**Code:**

```javascript
// Trước
const row1 = new ActionRowBuilder().addComponents(btnDownload, btnUtilities);

// Sau - chỉ cần đổi thứ tự
const row1 = new ActionRowBuilder().addComponents(btnUtilities, btnDownload);
```

---

### 📍 Ví dụ 4: Đổi thứ tự hàng

**Trước:**

```
Row 1: [Download] [Tiện ích]
Row 2: [Yêu cầu] [Báo lỗi]
```

**Sau:**

```
Row 1: [Yêu cầu] [Báo lỗi]
Row 2: [Download] [Tiện ích]
```

**Code:**

```javascript
// Trước
components: [row1, row2];

// Sau - chỉ cần đổi thứ tự trong mảng
components: [row2, row1];
```

---

## 5. Quy Tắc Quan Trọng

### ⚠️ Quy tắc 1: Mỗi hàng tối đa 5 nút

```javascript
// ✅ Đúng (5 nút)
row.addComponents(btn1, btn2, btn3, btn4, btn5);

// ❌ Sai (6 nút - sẽ lỗi!)
row.addComponents(btn1, btn2, btn3, btn4, btn5, btn6);
// Error: ActionRow cannot have more than 5 components
```

### ⚠️ Quy tắc 2: Tối đa 5 hàng mỗi message

```javascript
// ✅ Đúng (5 hàng)
components: [row1, row2, row3, row4, row5];

// ❌ Sai (6 hàng - sẽ lỗi!)
components: [row1, row2, row3, row4, row5, row6];
// Error: Message cannot have more than 5 ActionRows
```

### ⚠️ Quy tắc 3: Thứ tự trong addComponents = Trái → Phải

```javascript
// Hiển thị: [A] [B] [C] (trái sang phải)
row.addComponents(btnA, btnB, btnC);

// Hiển thị: [C] [B] [A]
row.addComponents(btnC, btnB, btnA);
```

### ⚠️ Quy tắc 4: Thứ tự trong components = Trên → Dưới

```javascript
// Row1 ở trên, Row2 ở dưới
components: [row1, row2];

// Row2 ở trên, Row1 ở dưới
components: [row2, row1];
```

### ⚠️ Quy tắc 5: Mỗi nút cần có CustomId duy nhất

```javascript
// ✅ Đúng - ID khác nhau
btnA.setCustomId("btn_download");
btnB.setCustomId("btn_utilities");

// ❌ Sai - ID trùng nhau sẽ gây xung đột!
btnA.setCustomId("my_button");
btnB.setCustomId("my_button");
```

---

## 📝 Lưu Ý Sau Khi Sửa

1. **Lưu file** (Ctrl+S)
2. **Restart bot** để thấy thay đổi:
   ```bash
   # Dừng bot (Ctrl+C)
   node index.js
   ```
3. **Test lại** bằng cách gõ `/menu` trong Discord

---

## 🔗 Tham Khảo

- [Discord.js ActionRowBuilder](https://discord.js.org/docs/packages/discord.js/main/ActionRowBuilder:Class)
- [Discord.js ButtonBuilder](https://discord.js.org/docs/packages/discord.js/main/ButtonBuilder:Class)
- [Hướng dẫn đổi màu](./HUONG_DAN_DOI_MAU.md)

---

_Tài liệu được tạo bởi Antigravity AI - 13/01/2026_
