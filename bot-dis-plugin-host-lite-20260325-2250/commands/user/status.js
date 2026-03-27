const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const LoadBalancer = require("../../utils/LoadBalancer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Xem trạng thái hoạt động của hệ thống (Bot, RAM, Ping)"),
  async execute(interaction) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    const statusEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("📊 Trạng thái hệ thống")
      .addFields(
        {
          name: "⏱️ Uptime",
          value: `${hours}h ${minutes}m ${seconds}s`,
          inline: true,
        },
        {
          name: "💾 RAM Usage",
          value: `${memUsage.toFixed(2)} MB`,
          inline: true,
        },
        {
          name: "📶 Ping",
          value: `${interaction.client.ws.ping}ms`,
          inline: true,
        },
        {
          name: "⚡ Download Lines (Load Balancer)",
          value: LoadBalancer.getStatus(),
          inline: false,
        },
      );

    await interaction.reply({
      embeds: [statusEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
