require("dotenv").config();

const { 
    Client, 
    GatewayIntentBits, 
    AuditLogEvent,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ===== إعدادات =====
const LOGS = {
    joinLeave: "1483028878590087189",
    roles: "1483029015991287808",
    punishments: "1483029219721347102",
    messageDelete: "1483029256954187880",
    messageCreate: "1483429957819568158"
};

const TOKEN = process.env.TOKEN;
const GUILD_ID = "1480125656753766554";
const WELCOME_CHANNEL = "1480128982996357313";
const AUTO_ROLE_ID = "1480937552386064536";

// ===== تشغيل البوت =====
client.once("clientReady", async () => {
    console.log(`✅ Bot Online: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('lock').setDescription('قفل الشات'),
        new SlashCommandBuilder().setName('unlock').setDescription('فتح الشات'),
        new SlashCommandBuilder()
            .setName('say')
            .setDescription('ارسال رسالة عن طريق البوت')
            .addStringOption(o => o.setName('text').setDescription('النص').setRequired(true)),
        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('تبنيد عضو')
            .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('السبب')),
        new SlashCommandBuilder()
            .setName('clear')
            .setDescription('مسح رسائل')
            .addStringOption(o => o.setName('amount').setDescription('عدد الرسائل أو all').setRequired(true))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Commands Loaded");
});

// ===== دالة لوق =====
async function sendLog(channel, content) {
    if (!channel) return;
    channel.send({
        content,
        allowedMentions: { parse: [] }
    }).catch(() => {});
}

// ================= دخول =================
client.on("guildMemberAdd", async member => {
    const channel = member.guild.channels.cache.get(LOGS.joinLeave);

    sendLog(channel, `📥 **دخول عضو**
👤 ${member}
🆔 ${member.id}
📅 <t:${Math.floor(Date.now()/1000)}:F>`);

    const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL);
    if (welcomeChannel) {
        welcomeChannel.send(`👋 أهلاً وسهلاً ${member} في السيرفر ❤️`);
    }

    const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
    if (role) {
        try {
            await member.roles.add(role);
        } catch {}
    }
});

// ================= خروج =================
client.on("guildMemberRemove", async member => {
    const channel = member.guild.channels.cache.get(LOGS.joinLeave);

    sendLog(channel, `📤 **خروج عضو**
👤 ${member.user.tag}
🆔 ${member.id}`);
});

// ================= بان =================
client.on("guildBanAdd", async ban => {
    const channel = ban.guild.channels.cache.get(LOGS.punishments);

    sendLog(channel, `🔨 **باند**
👤 ${ban.user.tag}`);
});

// ================= حذف رسالة =================
client.on("messageDelete", message => {
    if (!message.guild || message.author?.bot) return;

    const channel = message.guild.channels.cache.get(LOGS.messageDelete);

    sendLog(channel, `🗑️ **حذف رسالة**
👤 ${message.author}
📍 ${message.channel}
📝 ${message.content || "صورة/ملف"}`);
});

// ================= ارسال رسالة =================
client.on("messageCreate", message => {
    if (!message.guild || message.author.bot) return;

    const channel = message.guild.channels.cache.get(LOGS.messageCreate);

    sendLog(channel, `📩 **رسالة**
👤 ${message.author}
📝 ${message.content}`);

    if (message.content.includes("كود")) {
        message.reply("الكود : nsmbkrpf");
    }
});

// ================= أوامر Slash =================
client.on("interactionCreate", async i => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === "lock") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
            return i.reply({ content: "❌ ما عندك صلاحية", ephemeral: true });

        await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: false });
        i.reply("🔒 Locked");
    }

    if (i.commandName === "unlock") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
            return i.reply({ content: "❌ ما عندك صلاحية", ephemeral: true });

        await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: true });
        i.reply("🔓 Unlocked");
    }

    if (i.commandName === "say") {
        const t = i.options.getString("text");
        i.channel.send(t);
        i.reply({ content: "✅ تم", ephemeral: true });
    }

    if (i.commandName === "ban") {
        const u = i.options.getUser("user");
        const r = i.options.getString("reason") || "بدون سبب";

        await i.guild.members.ban(u.id, { reason: r });
        i.reply(`🔨 تم باند ${u}`);
    }

    if (i.commandName === "clear") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return i.reply({ content: "❌ ما عندك صلاحية", ephemeral: true });

        const amount = i.options.getString("amount");

        if (amount.toLowerCase() === "all") {
            const messages = await i.channel.messages.fetch({ limit: 100 });
            await i.channel.bulkDelete(messages, true);
            return i.reply({ content: "🧹 تم تنظيف الشات", ephemeral: true });
        }

        let num = parseInt(amount);
        if (isNaN(num)) num = 1;
        if (num > 100) num = 100;

        await i.channel.bulkDelete(num, true);
        i.reply({ content: `🧹 تم مسح ${num}`, ephemeral: true });
    }
});

// ===== منع الكراش =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);