const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Options,
  REST,
  Routes,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
// const LoadBalancer = require("./utils/LoadBalancer"); // Imported in sub-modules
const Logger = require("./utils/Logger");
require("dotenv").config();

// Handlers
const selectMenuHandler = require("./interactions/selectMenus");
const buttonHandler = require("./interactions/buttons");
const modalHandler = require("./interactions/modals");
const TextSearchHandler = require("./utils/TextSearchHandler");
const UserDataManager = require("./utils/UserDataManager");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    PresenceManager: 0,
    ThreadManager: 0,
    ReactionManager: 0,
    GuildScheduledEventManager: 0,
    AutoModerationRuleManager: 0,
  }),
});

client.commands = new Collection();
client.translateCache = new Collection();
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  if (fs.lstatSync(commandsPath).isDirectory()) {
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    }
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  // Tự động đăng ký lệnh (Auto-deploy)
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const commandsData = client.commands.map((c) => c.data.toJSON());

  try {
    console.log(
      `Started refreshing ${commandsData.length} application (/) commands.`,
    );

    // 1. Xóa sạch lệnh Guild (để tránh trùng lặp)
    const guilds = readyClient.guilds.cache.map((guild) => guild.id);
    for (const guildId of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(readyClient.user.id, guildId),
        { body: [] },
      );
      console.log(`Cleared guild commands for: ${guildId}`);
    }

    // 2. Đăng ký lệnh Global (Toàn cầu)
    await rest.put(Routes.applicationCommands(readyClient.user.id), {
      body: commandsData,
    });
    console.log(
      `Successfully reloaded ${commandsData.length} application (/) commands (Global).`,
    );
  } catch (error) {
    console.error(error);
  }

  // 3. Khởi động AutoScanner (quét mỗi 30 phút)
  const AutoScanner = require("./utils/AutoScanner");
  const autoScanner = new AutoScanner(client, 30); // 30 phút
  autoScanner.start();

  // Lưu vào client để có thể truy cập từ commands
  client.autoScanner = autoScanner;

  // 4. Khởi động Dashboard Server
  try {
    const { startDashboard } = require("./dashboard/server");
    startDashboard();
  } catch (err) {
    console.error("[Dashboard] Failed to start:", err.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.user?.id) {
    UserDataManager.updateLastActive(interaction.user.id);
  }

  if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command || typeof command.autocomplete !== "function") return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(
        `Autocomplete error for /${interaction.commandName}:`,
        error,
      );
      if (!interaction.responded) {
        await interaction.respond([]).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      Logger.log(
        interaction.user,
        "COMMAND",
        `Used command /${interaction.commandName}`,
      );
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "Có lỗi xảy ra khi thực thi lệnh!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "Có lỗi xảy ra khi thực thi lệnh!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  } else if (interaction.isStringSelectMenu()) {
    try {
      await selectMenuHandler.handle(interaction);
    } catch (error) {
      console.error("SelectMenu handler error:", error);
      const replyMethod =
        interaction.replied || interaction.deferred ? "followUp" : "reply";
      await interaction[replyMethod]({
        content: "Đã xảy ra lỗi khi xử lý menu!",
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  } else if (interaction.isButton()) {
    try {
      await buttonHandler.handle(interaction);
    } catch (error) {
      console.error("Button handler error:", error);
      const replyMethod =
        interaction.replied || interaction.deferred ? "followUp" : "reply";
      await interaction[replyMethod]({
        content: "Đã xảy ra lỗi khi xử lý nút bấm!",
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  } else if (interaction.isModalSubmit()) {
    try {
      await modalHandler.handle(interaction);
    } catch (error) {
      console.error("Modal handler error:", error);
      const replyMethod =
        interaction.replied || interaction.deferred ? "followUp" : "reply";
      await interaction[replyMethod]({
        content: "Đã xảy ra lỗi khi xử lý form!",
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
});

// Event listener cho Text Search - tìm kiếm plugin bằng chat
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author?.id && !message.author.bot) {
      UserDataManager.updateLastActive(message.author.id);
    }
    await TextSearchHandler.handle(message);
  } catch (error) {
    console.error("[TextSearchHandler] Error:", error);
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.log("Vui lòng cấu hình DISCORD_TOKEN trong file .env");
} else {
  client.login(process.env.DISCORD_TOKEN);
}
