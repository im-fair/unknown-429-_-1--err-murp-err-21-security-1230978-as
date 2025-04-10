try {
    import pkg from 'discord.js';
    import fs from 'fs';

    const { Client, GatewayIntentBits, EmbedBuilder } = pkg;
    console.log('GatewayIntentBits:', GatewayIntentBits);
} catch (err) {
    console.error('Import or top-level error:', err);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let isChatLoggingEnabled = true;
let isAuditLoggingEnabled = true;
let chatLogChannel = null;
let auditLogChannel = null;
let lastAuditLogTimestamp = null;

async function logChatMessage(content, userID, username, displayname, time, date) {
    const logMessage = `${displayname} (@${username}) ID: ${userID} || D: ${date} T: ${time}\n${content}`;
    
    if (isChatLoggingEnabled && chatLogChannel) {
        await chatLogChannel.send(logMessage);
    }
}

async function logAudits() {
    if (isAuditLoggingEnabled && auditLogChannel) {
        const guild = client.guilds.cache.get('YOUR_GUILD_ID');
        if (!guild) return;

        const auditLogs = await guild.fetchAuditLogs({ limit: 10 });
        const sortedLogs = auditLogs.entries.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

        for (const [, log] of sortedLogs) {
            if (!lastAuditLogTimestamp || log.createdTimestamp > lastAuditLogTimestamp) {
                const logMessage = `Action: ${log.action}\nUser: ${log.executor.tag}\nTime: ${new Date(log.createdTimestamp).toLocaleString()}\nDetails: ${log.reason || 'No details provided'}`;

                await auditLogChannel.send(logMessage);
                lastAuditLogTimestamp = log.createdTimestamp;
            }
        }
    }
}

async function startAuditLogging() {
    isAuditLoggingEnabled = true;
    while (isAuditLoggingEnabled) {
        await logAudits();
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

function stopAuditLogging() {
    isAuditLoggingEnabled = false;
}

async function setupLogging({ chatChannelID, auditChannelID }) {
    chatLogChannel = await client.channels.fetch(chatChannelID);
    auditLogChannel = await client.channels.fetch(auditChannelID);
    
    startAuditLogging();
}

client.once('ready', () => {
    console.log('Bot is ready!');
    setupLogging({
        chatChannelID: 'YOUR_CHAT_LOG_CHANNEL_ID',
        auditChannelID: 'YOUR_AUDIT_LOG_CHANNEL_ID'
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const { content, author: { id, username, displayName }, createdAt } = message;
    const time = createdAt.toLocaleTimeString();
    const date = createdAt.toLocaleDateString();
    logChatMessage(content, id, username, displayName, time, date);
});

export default function startBot() {
    client.login(process.env.BOT_API_KEY);
}
