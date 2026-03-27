// ========================================
// Giveaway Random - Main Script
// ========================================

// SVG Icons
const Icons = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  empty: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>`,
  target: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  gift: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  dice: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>`,
  // Rank icons for winners
  rank1: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6" fill="#fbbf24"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  rank2: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6" fill="#9ca3af"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  rank3: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cd7f32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6" fill="#cd7f32"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  rankDefault: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#8b5cf6" opacity="0.3"/><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

// State Management
const state = {
  participants: [],
  winners: [],
  settings: {
    minNumber: 1,
    maxNumber: 100,
    winnersCount: 2,
    prizeName: "",
  },
  isSpinning: false,
};

// DOM Elements
const elements = {
  // Settings
  minNumber: document.getElementById("minNumber"),
  maxNumber: document.getElementById("maxNumber"),
  winnersCount: document.getElementById("winnersCount"),
  prizeName: document.getElementById("prizeName"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsToggle: document.getElementById("settingsToggle"),

  // Join Form
  playerName: document.getElementById("playerName"),
  selectedNumber: document.getElementById("selectedNumber"),
  randomBtn: document.getElementById("randomBtn"),
  manualNumber: document.getElementById("manualNumber"),
  joinForm: document.getElementById("joinForm"),
  joinBtn: document.getElementById("joinBtn"),

  // Participants
  participantsList: document.getElementById("participantsList"),
  participantCount: document.getElementById("participantCount"),
  clearBtn: document.getElementById("clearBtn"),

  // Spin
  spinDisplay: document.getElementById("spinDisplay"),
  spinNumber: document.getElementById("spinNumber"),
  spinBtn: document.getElementById("spinBtn"),

  // Winners
  winnersSection: document.getElementById("winnersSection"),
  winnersList: document.getElementById("winnersList"),
  newRoundBtn: document.getElementById("newRoundBtn"),

  // Effects
  confettiContainer: document.getElementById("confettiContainer"),
  spinSound: document.getElementById("spinSound"),
  winSound: document.getElementById("winSound"),
};

// ========================================
// Utility Functions
// ========================================

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateSettings() {
  state.settings.minNumber = parseInt(elements.minNumber.value) || 1;
  state.settings.maxNumber = parseInt(elements.maxNumber.value) || 100;
  state.settings.winnersCount = parseInt(elements.winnersCount.value) || 2;
  state.settings.prizeName = elements.prizeName.value;

  // Update manual number input constraints
  elements.manualNumber.min = state.settings.minNumber;
  elements.manualNumber.max = state.settings.maxNumber;
  elements.manualNumber.placeholder = `${state.settings.minNumber} - ${state.settings.maxNumber}`;
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;

  const icon =
    type === "success"
      ? Icons.success
      : type === "error"
        ? Icons.error
        : Icons.info;

  notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
    `;

  // Add styles dynamically
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${
          type === "success"
            ? "linear-gradient(135deg, #10b981, #059669)"
            : type === "error"
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #8b5cf6, #7c3aed)"
        };
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        z-index: 9999;
        animation: slideInNotification 0.3s ease;
    `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOutNotification 0.3s ease forwards";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add notification animations
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
    @keyframes slideInNotification {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutNotification {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// ========================================
// Participants Management
// ========================================

function renderParticipants() {
  if (state.participants.length === 0) {
    elements.participantsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">${Icons.empty}</span>
                <p>Chưa có ai tham gia</p>
                <small>Hãy là người đầu tiên!</small>
            </div>
        `;
  } else {
    elements.participantsList.innerHTML = state.participants
      .map(
        (p, index) => `
            <div class="participant-item ${state.winners.includes(p) ? "winner" : ""}" data-index="${index}">
                <div class="participant-info">
                    <div class="participant-avatar">${p.name.charAt(0).toUpperCase()}</div>
                    <span class="participant-name">${escapeHtml(p.name)}</span>
                </div>
                <span class="participant-number">${p.number}</span>
            </div>
        `,
      )
      .join("");
  }

  elements.participantCount.textContent = state.participants.length;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addParticipant(name, number) {
  // Validate
  if (!name.trim()) {
    showNotification("Vui lòng nhập tên của bạn!", "error");
    return false;
  }

  if (number < state.settings.minNumber || number > state.settings.maxNumber) {
    showNotification(
      `Số phải từ ${state.settings.minNumber} đến ${state.settings.maxNumber}!`,
      "error",
    );
    return false;
  }

  // Check if number already taken
  if (state.participants.some((p) => p.number === number)) {
    showNotification(`Số ${number} đã được chọn bởi người khác!`, "error");
    return false;
  }

  // Check if name already exists
  if (
    state.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())
  ) {
    showNotification("Tên này đã được đăng ký!", "error");
    return false;
  }

  state.participants.push({ name: name.trim(), number });
  renderParticipants();
  showNotification(`${name} đã tham gia với số ${number}!`, "success");

  // Save to localStorage
  saveToStorage();

  return true;
}

function clearParticipants() {
  if (state.participants.length === 0) {
    showNotification("Không có người tham gia để xóa!", "info");
    return;
  }

  if (confirm("Bạn có chắc muốn xóa tất cả người tham gia?")) {
    state.participants = [];
    state.winners = [];
    renderParticipants();
    elements.winnersSection.classList.add("hidden");
    elements.winnersList.innerHTML = "";

    // Lưu trạng thái rỗng lên server
    saveToStorage();

    showNotification("Đã xóa tất cả người tham gia!", "success");
  }
}

// ========================================
// Random Number Functions
// ========================================

function generateRandomNumber() {
  updateSettings();

  // Find available numbers
  const takenNumbers = state.participants.map((p) => p.number);
  const availableNumbers = [];

  for (let i = state.settings.minNumber; i <= state.settings.maxNumber; i++) {
    if (!takenNumbers.includes(i)) {
      availableNumbers.push(i);
    }
  }

  if (availableNumbers.length === 0) {
    showNotification("Không còn số nào khả dụng!", "error");
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  return availableNumbers[randomIndex];
}

// ========================================
// Spin Functions
// ========================================

async function startSpin() {
  if (state.isSpinning) return;

  if (state.participants.length < state.settings.winnersCount) {
    showNotification(
      `Cần ít nhất ${state.settings.winnersCount} người tham gia để quay!`,
      "error",
    );
    return;
  }

  state.isSpinning = true;
  state.winners = [];
  elements.spinBtn.disabled = true;
  elements.spinBtn.classList.add("spinning");
  elements.spinDisplay.classList.add("spinning");

  // Play spin sound
  try {
    elements.spinSound.currentTime = 0;
    elements.spinSound.play();
  } catch (e) {}

  // Animate through numbers
  const spinDuration = 3000;
  const spinInterval = 50;
  const startTime = Date.now();

  const spinAnimation = setInterval(() => {
    const randomNum = getRandomNumber(
      state.settings.minNumber,
      state.settings.maxNumber,
    );
    elements.spinNumber.textContent = randomNum;

    if (Date.now() - startTime >= spinDuration) {
      clearInterval(spinAnimation);
      selectWinners();
    }
  }, spinInterval);
}

function selectWinners() {
  // Get winning number
  const winningNumber = getRandomNumber(
    state.settings.minNumber,
    state.settings.maxNumber,
  );
  elements.spinNumber.textContent = winningNumber;

  // Find participants closest to winning number
  const sortedParticipants = [...state.participants].sort((a, b) => {
    return (
      Math.abs(a.number - winningNumber) - Math.abs(b.number - winningNumber)
    );
  });

  state.winners = sortedParticipants.slice(0, state.settings.winnersCount);

  // Stop spinning animation
  elements.spinBtn.disabled = false;
  elements.spinBtn.classList.remove("spinning");
  elements.spinDisplay.classList.remove("spinning");
  state.isSpinning = false;

  // Play win sound
  try {
    elements.winSound.currentTime = 0;
    elements.winSound.play();
  } catch (e) {}

  // Show winners
  displayWinners(winningNumber);

  // Update participants list to show winners
  renderParticipants();

  // Confetti!
  createConfetti();
}

function getRankIcon(index) {
  switch (index) {
    case 0:
      return Icons.rank1;
    case 1:
      return Icons.rank2;
    case 2:
      return Icons.rank3;
    default:
      return Icons.rankDefault;
  }
}

function displayWinners(winningNumber) {
  elements.winnersList.innerHTML = state.winners
    .map(
      (winner, index) => `
        <div class="winner-card" style="animation-delay: ${index * 0.2}s">
            <div class="winner-rank">${getRankIcon(index)}</div>
            <div class="winner-name">${escapeHtml(winner.name)}</div>
            <div class="winner-number-display">Số ${winner.number}</div>
            ${state.settings.prizeName ? `<div class="winner-prize" style="margin-top: 8px; color: #a0a0b8; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 6px;">${Icons.gift} ${escapeHtml(state.settings.prizeName)}</div>` : ""}
        </div>
    `,
    )
    .join("");

  // Show winning number announcement
  const announcement = document.createElement("div");
  announcement.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px; padding: 16px; background: rgba(139, 92, 246, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 12px;">
            <span style="display: flex; align-items: center;">${Icons.target}</span>
            <span style="font-size: 1.2rem; color: #a78bfa;">Số may mắn:</span>
            <span style="font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${winningNumber}</span>
        </div>
    `;
  elements.winnersList.insertBefore(
    announcement,
    elements.winnersList.firstChild,
  );

  elements.winnersSection.classList.remove("hidden");

  // Scroll to winners section
  elements.winnersSection.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function createConfetti() {
  const colors = [
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#06b6d4",
    "#ec4899",
  ];

  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = Math.random() * 10 + 5 + "px";
      confetti.style.height = confetti.style.width;
      confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
      confetti.style.animationDuration = Math.random() * 2 + 2 + "s";

      elements.confettiContainer.appendChild(confetti);

      setTimeout(() => confetti.remove(), 4000);
    }, i * 30);
  }
}

function startNewRound() {
  state.winners = [];
  elements.winnersSection.classList.add("hidden");
  elements.winnersList.innerHTML = "";
  elements.spinNumber.textContent = "?";
  renderParticipants();
  showNotification("Bắt đầu vòng mới! Quay số thôi!", "info");
}

// ========================================
// Storage Functions
// ========================================

// ========================================
// Storage Functions & Server Sync
// ========================================

async function saveToStorage() {
  // 1. Save Local
  localStorage.setItem(
    "giveaway_participants",
    JSON.stringify(state.participants),
  );
  localStorage.setItem("giveaway_settings", JSON.stringify(state.settings));

  // 2. Save Server
  try {
    await fetch("/api/giveaway/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participants: state.participants,
        settings: state.settings,
        winners: state.winners,
      }),
    });
  } catch (e) {
    console.error("Server save failed:", e);
  }
}

async function loadFromStorage() {
  // 1. Try Load Server first
  try {
    const res = await fetch("/api/giveaway/data");
    if (res.ok) {
      const data = await res.json();
      if (data && (data.participants || data.settings)) {
        if (data.participants) state.participants = data.participants;
        if (data.settings) {
          state.settings = { ...state.settings, ...data.settings };
          // Update Inputs
          if (elements.minNumber)
            elements.minNumber.value = state.settings.minNumber;
          if (elements.maxNumber)
            elements.maxNumber.value = state.settings.maxNumber;
          if (elements.winnersCount)
            elements.winnersCount.value = state.settings.winnersCount;
          if (elements.prizeName)
            elements.prizeName.value = state.settings.prizeName || "";
        }
        if (data.winners) state.winners = data.winners;

        updateSettings();
        renderParticipants();
        // Option specific: render winners if needed
        return; // Success loading from server
      }
    }
  } catch (e) {
    console.error("Server load failed, using local:", e);
  }

  // 2. Fallback Local Storage
  const savedParticipants = localStorage.getItem("giveaway_participants");
  const savedSettings = localStorage.getItem("giveaway_settings");

  if (savedParticipants) {
    state.participants = JSON.parse(savedParticipants);
    renderParticipants();
  }

  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    elements.minNumber.value = settings.minNumber || 1;
    elements.maxNumber.value = settings.maxNumber || 100;
    elements.winnersCount.value = settings.winnersCount || 2;
    elements.prizeName.value = settings.prizeName || "";
    updateSettings();
  }
}

// Auto-Sync Polling (5s)
setInterval(async () => {
  try {
    // Chỉ fetch và update nếu có sự thay đổi từ người khác (để tránh overwrite khi đang nhập)
    // Tuy nhiên ở đây logic đơn giản là lấy về và render lại list
    const res = await fetch("/api/giveaway/data");
    if (res.ok) {
      const data = await res.json();

      // Sync participants if changed
      if (
        data.participants &&
        JSON.stringify(data.participants) !== JSON.stringify(state.participants)
      ) {
        state.participants = data.participants;
        renderParticipants();
      }

      // Sync settings if changed (optional, cẩn thận kẻo input đang gõ bị nhảy)
      if (
        data.settings &&
        JSON.stringify(data.settings) !== JSON.stringify(state.settings)
      ) {
        state.settings = { ...state.settings, ...data.settings };
        // Update UI inputs
        if (document.activeElement !== elements.minNumber)
          elements.minNumber.value = state.settings.minNumber;
        if (document.activeElement !== elements.maxNumber)
          elements.maxNumber.value = state.settings.maxNumber;
        if (document.activeElement !== elements.winnersCount)
          elements.winnersCount.value = state.settings.winnersCount;
        if (document.activeElement !== elements.prizeName)
          elements.prizeName.value = state.settings.prizeName;

        updateSettings();
      }
    }
  } catch (e) {}
}, 5000);

// ========================================
// Event Listeners
// ========================================

// Settings change
elements.minNumber.addEventListener("change", () => {
  updateSettings();
  saveToStorage();
});
elements.maxNumber.addEventListener("change", () => {
  updateSettings();
  saveToStorage();
});
elements.winnersCount.addEventListener("change", () => {
  updateSettings();
  saveToStorage();
});
elements.prizeName.addEventListener("input", () => {
  updateSettings();
  saveToStorage();
});

// Random button
elements.randomBtn.addEventListener("click", () => {
  const num = generateRandomNumber();
  if (num !== null) {
    elements.selectedNumber.textContent = num;
    elements.manualNumber.value = num;

    // Add animation
    elements.selectedNumber.style.transform = "scale(1.2)";
    setTimeout(() => {
      elements.selectedNumber.style.transform = "scale(1)";
    }, 200);
  }
});

// Manual number input
elements.manualNumber.addEventListener("input", () => {
  const value = parseInt(elements.manualNumber.value);
  if (!isNaN(value)) {
    elements.selectedNumber.textContent = value;
  }
});

// Join form
elements.joinForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = elements.playerName.value;
  const number =
    parseInt(elements.manualNumber.value) ||
    parseInt(elements.selectedNumber.textContent);

  if (isNaN(number) || elements.selectedNumber.textContent === "?") {
    showNotification("Vui lòng chọn một số trước!", "error");
    return;
  }

  if (addParticipant(name, number)) {
    // Reset form
    elements.playerName.value = "";
    elements.manualNumber.value = "";
    elements.selectedNumber.textContent = "?";
    elements.playerName.focus();
  }
});

// Clear button
elements.clearBtn.addEventListener("click", clearParticipants);

// Spin button
elements.spinBtn.addEventListener("click", startSpin);

// New round button
elements.newRoundBtn.addEventListener("click", startNewRound);

// ========================================
// Server IP Copy
// ========================================

function copyServerIP() {
  const ip = "stardust.pikamc.vn:26033";

  // Modern way
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(ip)
      .then(() => {
        showNotification(`Đã copy IP: ${ip}`, "success");
      })
      .catch(() => {
        fallbackCopy(ip);
      });
  } else {
    fallbackCopy(ip);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    showNotification(`Đã copy IP: ${text}`, "success");
  } catch (err) {
    showNotification("Không thể copy IP!", "error");
  }
  document.body.removeChild(textArea);
}

// ========================================
// Initialize
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  // Mobile settings toggle logic
  if (elements.settingsToggle) {
    elements.settingsToggle.addEventListener("click", () => {
      elements.settingsPanel.classList.toggle("collapsed");
    });

    // Auto collapse on mobile
    if (window.innerWidth < 768) {
      elements.settingsPanel.classList.add("collapsed");
    }
  }

  updateSettings();
  loadFromStorage();
  console.log("Giveaway Random initialized!");
});
