const { fork } = require("child_process");
const path = require("path");
require("dotenv").config();

const token1 = process.env.DISCORD_TOKEN;
const token2 = process.env.DISCORD_TOKEN_2;

if (!token1) {
  console.error("❌ Lỗi: Không tìm thấy DISCORD_TOKEN trong file .env");
  process.exit(1);
}

// Hàm chạy bot
const runBot = (name, envVars) => {
  console.log(`🚀 Đang khởi động ${name}...`);

  // Sử dụng fork để tạo process con, kế thừa stdio để in log ra terminal hiện tại
  const child = fork(path.join(__dirname, "index.js"), [], {
    env: { ...process.env, ...envVars },
    stdio: "inherit",
  });

  child.on("error", (err) => {
    console.error(`❌ ${name} gặp lỗi:`, err);
  });

  child.on("exit", (code) => {
    console.log(`⚠️ ${name} đã dừng với mã: ${code}`);
  });
};

// ==========================================
// 1. Chạy Bot Chính (Sử dụng config mặc định)
// ==========================================
runBot("Bot 1 (Chính)", {});

// ==========================================
// 2. Chạy Bot Phụ (Nếu có cấu hình)
// ==========================================
if (token2) {
  // Tự động tăng port dashboard lên 1 đơn vị để tránh trùng port (26012 -> 26013)
  const defaultPort = parseInt(process.env.DASHBOARD_PORT || 26012);
  const port2 = defaultPort + 1;

  runBot("Bot 2 (Phụ)", {
    DISCORD_TOKEN: token2, // Ghi đè token bằng token 2
    DASHBOARD_PORT: port2, // Ghi đè port dashboard
  });

  console.log(`ℹ️  Bot 2 sẽ chạy Dashboard tại port: ${port2}`);
} else {
  console.log(
    "\n-------------------------------------------------------------",
  );
  console.log("⚠️  CHƯA TÌM THẤY DISCORD_TOKEN_2");
  console.log("   Chỉ bot chính đang chạy.");
  console.log(
    "   Để chạy bot thứ 2, hãy mở file .env và thêm dòng sau vào cuối:",
  );
  console.log("   DISCORD_TOKEN_2=token_bot_thu_2_cua_ban");
  console.log(
    "-------------------------------------------------------------\n",
  );
}
