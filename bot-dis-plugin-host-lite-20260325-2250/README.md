# Plugin Discord Bot

Bot này cho phép admin upload file plugin và người dùng tìm kiếm/tải xuống.

## Cài đặt

1.  Cài đặt dependencies:
    ```bash
    npm install
    ```
2.  Đổi tên hoặc chỉnh sửa file `.env`:
    ```
    DISCORD_TOKEN=your_token_here
    CLIENT_ID=your_client_id_here
    GUILD_ID=your_guild_id_here  # Optional: Để cập nhật lệnh nhanh hơn trên server test
    DASHBOARD_PORT=26012
    PUBLIC_BASE_URL=https://your-domain.com  # Optional: Link public để nút "Tải trên Web" trỏ đúng domain
    OPENAI_API_KEY=your_openai_key
    AGENT_ROUTER_TOKEN=your_agentrouter_key # Optional: dùng thay OPENAI_API_KEY
    OPENAI_API_BASE=https://api.openai.com/v1  # Optional: endpoint OpenAI-compatible (agent router)
    OPENAI_TRANSLATE_MODEL=gpt-5-nano  # Tùy chọn: model dịch tiết kiệm
    TRANSLATE_SKILL=minecraft_smooth   # Tùy chọn: minecraft_smooth | minecraft_economy | minecraft_strict
    TRANSLATE_BATCH_SIZE=40            # Tùy chọn: số dòng unique / request
    TRANSLATE_CACHE_LIMIT=8000         # Tùy chọn: số câu dịch lưu cache cục bộ
    ```

## Chạy Bot

1.  Đăng ký lệnh (Slash Commands):
    Chạy lệnh này **một lần** mỗi khi bạn thêm/sửa file trong thư mục `commands/`.

    ```bash
    node deploy-commands.js
    ```

2.  Khởi động Bot:
    ```bash
    node index.js
    ```

## Sử dụng

- **Admin**: Dùng lệnh `/upload`

  - Nhập `name` (Tên plugin)
  - Đính kèm `file`
  - Nhập `description` (Mô tả)
  - Bot sẽ lưu file vào `data/files` và ghi thông tin vào `data/plugins.json`.

- **User**: Dùng lệnh `/search`
  - Nhập `query` (Từ khóa tìm kiếm)
  - Bot trả về menu chọn.
  - Chọn plugin -> Bot gửi file về.

## Web Tải Public

- Trang tải public: `http://localhost:<DASHBOARD_PORT>/downloads`
- API public:
  - `GET /api/public/categories`
  - `GET /api/public/plugins?search=&category=&page=1&limit=24`
  - `GET /api/public/download/:pluginId`
  - `GET /api/public/translate/meta`
  - `POST /api/public/translate/text` (`engine`, `skill`, `text`)
  - `POST /api/public/translate/file` (`engine`, `skill`, `file`)

## Cấu Hình Dịch Minecraft Tiết Kiệm Quota

- `/dich` và dịch text đã tối ưu cho ngữ cảnh Minecraft:
  - Giữ nguyên placeholder, command, permission node, mã màu.
  - Dùng cache dịch cục bộ để không gọi lại API cho câu trùng.
  - Chỉ gọi API cho dòng unique.
- Skill dịch:
  - `minecraft_smooth` (mặc định): tự nhiên, mượt.
  - `minecraft_economy`: ưu tiên tiết kiệm token/quota.
  - `minecraft_strict`: bám sát câu gốc.
- Mặc định model ChatGPT dịch: `gpt-5-nano` (nếu không khả dụng sẽ tự fallback `gpt-4o-mini`).
- Nếu dùng AgentRouter:
  - `OPENAI_API_BASE=https://agentrouter.org/v1`
  - Dùng `AGENT_ROUTER_TOKEN` (hoặc gán token đó vào `OPENAI_API_KEY`).
