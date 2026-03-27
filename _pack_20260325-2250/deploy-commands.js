const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const commands = [];
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
        commands.push(command.data.toJSON());
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    if (!process.env.CLIENT_ID || !process.env.DISCORD_TOKEN) {
      console.error("Missing CLIENT_ID or DISCORD_TOKEN in .env");
      return;
    }

    let route;
    if (process.env.GUILD_ID) {
      route = Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      );
      console.log("Deploying to Guild: " + process.env.GUILD_ID);
    } else {
      route = Routes.applicationCommands(process.env.CLIENT_ID);
      console.log("Deploying Globally");
    }

    const data = await rest.put(route, { body: commands });

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
