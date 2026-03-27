# Hướng dẫn cài đặt Bot Plugin

## Yêu cầu hệ thống

- **Node.js:** v18 trở lên
- **npm:** v8 trở lên
- **RAM:** Tối thiểu 512MB
- **Disk:** Tùy thuộc số lượng plugin

---

## Bước 1: Tải mã nguồn

```bash
# Clone từ Git (nếu có)
git clone <repository-url>

# Hoặc giải nén file zip
unzip bot-code-only.zip
```

---

## Bước 2: Cài đặt dependencies

```bash
cd bot-dis-plugin
npm install
```

---

## Bước 3: Cấu hình .env

Tạo file `.env` trong thư mục gốc:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_server_id_here
ADMIN_ID=your_discord_user_id
DASHBOARD_PORT=26012
SESSION_SECRET=random_secret_string
PUBLIC_BASE_URL=https://your-domain.com
OPENAI_API_KEY=your_openai_key
AGENT_ROUTER_TOKEN=your_agentrouter_key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_TRANSLATE_MODEL=gpt-5-nano
TRANSLATE_SKILL=minecraft_smooth
TRANSLATE_BATCH_SIZE=40
TRANSLATE_CACHE_LIMIT=8000
```

> `PUBLIC_BASE_URL` là URL public của host (không có dấu `/` cuối). Bot sẽ dùng biến này để tạo nút **Tải trên Web** trong `/menu`.
>
> `OPENAI_TRANSLATE_MODEL`: model dùng cho tính năng dịch ChatGPT (khuyến nghị `gpt-5-nano` để tiết kiệm).
>
> `TRANSLATE_SKILL`: profile dịch mặc định (`minecraft_smooth`, `minecraft_economy`, `minecraft_strict`).
>
> Nếu dùng AgentRouter: đặt `OPENAI_API_BASE=https://agentrouter.org/v1` và dùng `AGENT_ROUTER_TOKEN` (hoặc đặt token đó vào `OPENAI_API_KEY`).

### Lấy các giá trị:

**DISCORD_TOKEN:**

1. Vào https://discord.com/developers/applications
2. Chọn application của bạn
3. Vào Bot → Copy Token

**CLIENT_ID:**

1. Vào OAuth2 → General
2. Copy Client ID

**GUILD_ID:**

1. Bật Developer Mode trong Discord
2. Click phải vào server → Copy Server ID

**ADMIN_ID:**

1. Click phải vào user của bạn → Copy User ID

---

## Bước 4: Cấu trúc thư mục

Đảm bảo có các thư mục sau:

```
bot-dis-plugin/
├── data/
│   ├── files/           # Chứa plugin (.jar, .zip)
│   ├── plugins.json     # Database plugin
│   ├── userdata.json    # Dữ liệu người dùng
│   └── dashboard_stats.json
├── commands/
├── utils/
├── dashboard/
├── .env
├── index.js
└── package.json
```

---

## Bước 5: Thêm plugin

Đặt các file plugin vào `data/files/`:

```
data/files/
├── CMI/
│   ├── CMI-9.6.0.jar
│   └── CMI-9.5.0.jar
├── EcoMobs/
│   └── EcoMobs-10.0.jar
└── ItemsAdder/
    └── ItemsAdder-3.5.0.zip
```

---

## Bước 6: Deploy commands

```bash
node deploy-commands.js
```

---

## Bước 7: Khởi động bot

```bash
node index.js
```

Đầu ra thành công:

```
[PluginManager] Loaded X plugins from DB.
[UserDataManager] Loaded X user records.
Ready! Logged in as Bot#1234
[Dashboard] Running at http://localhost:26012
```

---

## Hosting trên Pterodactyl (PikaMC)

### Cấu hình:

- **Image:** Node.js
- **Startup command:** `node index.js`
- **Port:** 26012 (cho Dashboard)

### File Manager:

1. Upload tất cả file lên
2. Tạo file `.env` với đầy đủ giá trị
3. Chạy `npm install` trong Console

### Mở port Dashboard:

1. Network → Allocations
2. Thêm port 26012
3. Restart server

---

## Cập nhật Bot

```bash
# Dừng bot
Ctrl + C

# Pull code mới (nếu dùng Git)
git pull

# Cài dependencies mới
npm install

# Khởi động lại
node index.js
```

---

## Xử lý lỗi

### "Cannot find module X"

```bash
npm install
```

### "Invalid token"

- Kiểm tra DISCORD_TOKEN trong .env
- Tạo token mới nếu cần

### "Missing Access"

- Bot chưa được mời vào server
- Thiếu quyền cần thiết

### Port đã được sử dụng

- Đổi DASHBOARD_PORT trong .env
- Dừng process đang chạy trên port đó

---

## Backup dữ liệu

Các file cần backup:

- `data/plugins.json`
- `data/userdata.json`
- `data/dashboard_stats.json`
- `data/files/*` (tất cả plugin)
- `.env`
