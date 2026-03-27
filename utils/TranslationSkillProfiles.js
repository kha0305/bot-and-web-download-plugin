const DEFAULT_TRANSLATION_SKILL = "minecraft_precision";

const TRANSLATION_SKILLS = Object.freeze({
  minecraft_precision: {
    name: "Minecraft Precision",
    description:
      "Dịch kỹ và sát nghĩa gốc, giữ cấu trúc câu tối đa, ưu tiên tính chính xác.",
    outputRatio: 1.18,
    minTokens: 220,
    maxTokens: 1800,
    styleInstruction:
      "Preserve source meaning with high fidelity. Keep sentence order and structure as close as possible. Avoid adding extra nuance not present in source.",
  },
  minecraft_strict: {
    name: "Minecraft Strict",
    description: "Bám cực sát câu gốc, hạn chế diễn giải.",
    outputRatio: 1.15,
    minTokens: 180,
    maxTokens: 1500,
    styleInstruction:
      "Keep structure close to source text. Prefer literal but natural translation. Never add or remove technical detail.",
  },
  minecraft_smooth: {
    name: "Minecraft Smooth",
    description: "Mượt, tự nhiên, đúng ngữ cảnh plugin Minecraft.",
    outputRatio: 1.25,
    minTokens: 220,
    maxTokens: 1800,
    styleInstruction:
      "Use natural, player-friendly phrasing while preserving meaning and technical tokens.",
  },
  minecraft_economy: {
    name: "Minecraft Economy",
    description: "Ngắn gọn, tiết kiệm token/quota tối đa.",
    outputRatio: 1.08,
    minTokens: 160,
    maxTokens: 1100,
    styleInstruction:
      "Use concise wording with shortest clear phrasing while preserving meaning.",
  },
});

module.exports = {
  DEFAULT_TRANSLATION_SKILL,
  TRANSLATION_SKILLS,
};
