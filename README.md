# Bot + Web Download Plugin

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)

Hệ thống gồm:
- Discord bot để upload, tìm kiếm, tải plugin/resources.
- Dashboard admin để quản lý file, thống kê, upload trực tiếp.
- Trang public `/downloads` để người dùng tải plugin và dịch nhanh file config/text theo ngữ cảnh Minecraft.

## Tính năng chính

- Quản lý kho plugin/resources theo file thực trong `data/files`.
- Tìm kiếm và tải nhanh qua lệnh Discord (`/search`, `/download`, `/favorites`, ...).
- Dashboard web admin có login bằng Discord ID (`ADMIN_ID`).
- Web public download + bộ lọc danh mục + phân trang.
- Dịch văn bản/file với 2 engine:
  - Google Translate (miễn phí).
  - ChatGPT/OpenAI-compatible (OpenAI hoặc AgentRouter).
- Hỗ trợ dịch nhiều định dạng:
  - File text/config: `.yml`, `.yaml`, `.ym`, `.txt`, `.md`, `.json`, `.properties`, `.conf`, `.lang`, `.toml`, `.ini`
  - Archive: `.jar`, `.zip` (tự động quét và chọn file config/lang phù hợp để dịch).
- Skill profile dịch (smooth/precision/economy/strict), chọn model và ngôn ngữ đích.
- Ước lượng token + chi phí USD theo model, có cache để giảm quota.

## Cấu trúc thư mục

```text
commands/          # Slash commands (admin/user)
interactions/      # Button/modal handlers
utils/             # Core logic: Translator, PluginManager, ...
dashboard/         # Admin dashboard + public downloads page
data/              # Dữ liệu runtime (plugins, files, stats, cache)
docs/              # Tài liệu bổ sung
index.js           # Entry bot
deploy-commands.js # Đăng ký slash commands
```

## Yêu cầu môi trường

- Node.js 18+ (khuyến nghị LTS mới).
- Discord Bot Token + `CLIENT_ID`.
- Quyền ghi file tại thư mục dự án (để lưu data/cache/upload).

## Cài đặt nhanh

1. Cài dependencies:

```bash
npm install
```

2. Tạo `.env` từ file mẫu:

```bash
copy .env.example .env
```

Sau đó mở `.env` và điền token/key thật của bạn.

3. Đăng ký slash commands:

```bash
node deploy-commands.js
```

4. Chạy bot + dashboard:

```bash
npm start
```

Hoặc chạy multi-instance script (nếu bạn đang dùng kiến trúc nhiều shard/process):

```bash
npm run start-multi
```

## Truy cập web

- Admin dashboard: `http://localhost:<DASHBOARD_PORT>/`
- Public downloads + dịch file: `http://localhost:<DASHBOARD_PORT>/downloads`

## API public

- `GET /api/public/categories`
- `GET /api/public/plugins?search=&category=&page=1&limit=24`
- `GET /api/public/download/:pluginId`
- `GET /api/public/translate/meta`
- `POST /api/public/translate/text`
- `POST /api/public/translate/file`

## Các lệnh Discord tiêu biểu

- User:
  - `/search`, `/download`, `/favorites`, `/history`, `/menu`, `/dich`, `/status`
- Admin:
  - `/upload`, `/scan`, `/autoscan`, `/reload`, `/admin`

## Dịch file Minecraft

- Lệnh bot:
  - `/dich file:<file> model:<model_id> lang:<ma_ngon_ngu>`
- Web `/downloads`:
  - Chọn tab `Dịch Minecraft`.
  - Chọn engine/model/skill/language.
  - Upload file text hoặc `.jar/.zip` để hệ thống auto-detect file config/lang hợp lệ.

## Troubleshooting

### 1) Lỗi `401` khi dịch ChatGPT/AgentRouter

Kiểm tra:
- `OPENAI_API_BASE` đúng provider chưa (`https://agentrouter.org/v1` hoặc OpenAI base).
- Token/key còn hiệu lực và có quyền model đang chọn.
- Nếu dùng AgentRouter, ưu tiên dùng `AGENT_ROUTER_TOKEN` và để `OPENAI_API_KEY` trống để tránh nhầm.
- Có thể bật fallback tự động sang Google để không gián đoạn dịch:
  - `TRANSLATE_FALLBACK_TO_GOOGLE=true`

### 2) Không hiện giá model trong dropdown

- Thêm model vào `OPENAI_TRANSLATE_MODELS`.
- Bổ sung giá trong `OPENAI_MODEL_PRICING_JSON` theo đơn vị USD / 1M token.

### 3) Dịch `.jar` không ra kết quả mong muốn

- Đảm bảo trong archive có file config/lang hợp lệ.
- Hệ thống chỉ dịch các file text/config, không dịch class/binary.

## Bảo mật

- Không commit `.env`, token hoặc file chứa secret.
- Nên thay `SESSION_SECRET` trước khi deploy production.
- Nếu public internet, đặt reverse proxy + HTTPS.

## Roadmap

Xem chi tiết tại `ROADMAP.md`.
