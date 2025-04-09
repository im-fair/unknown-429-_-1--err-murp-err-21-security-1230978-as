const { Client, GatewayIntentBits, MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = './userData.json';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let saveInfo = {};
let botPrefix = '/';
let adminRoles = [];
let dumpChannel = null;
let auditChannel = null;
let logChannel = null;

async function isAdmin(user) {
    const member = await user.guild.members.fetch(user.id);
    return member.roles.cache.some(role => adminRoles.includes(role.name));
}

function loadUserData() {
    if (fs.existsSync(path)) {
        const rawData = fs.readFileSync(path);
        saveInfo = JSON.parse(rawData);
    }
}

function saveUserData() {
    fs.writeFileSync(path, JSON.stringify(saveInfo, null, 2));
}

async function logUserInfo(message) {
    const userID = message.author.id;
    const displayName = message.author.username;
    const isUserAdmin = await isAdmin(message.author);
    const userKey = "User_" + userID;

    if (!saveInfo[userKey]) {
        saveInfo[userKey] = {
            UserID: parseInt(userID),
            AdminPermissions: isUserAdmin
        };
    } else {
        saveInfo[userKey].AdminPermissions = isUserAdmin;
    }

    saveUserData();

    if (Object.keys(saveInfo).length >= 500) {
        clearUserData();
    }
}

async function clearUserData() {
    saveInfo = {};
    saveUserData();

    if (dumpChannel) {
        const embed = new MessageEmbed()
            .setColor('#FF0000')
            .setTitle('User Data Cleared')
            .setDescription('All user data has been cleared due to the 500 user limit being reached.')
            .setTimestamp();

        await dumpChannel.send({ embeds: [embed] });
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    await logUserInfo(message);

    const content = message.content;

    if (content.startsWith(botPrefix + 'changePrefix')) {
        const newPrefix = content.split(' ')[1];
        if (newPrefix && newPrefix.length === 1 && /[^a-zA-Z0-9]/.test(newPrefix)) {
            botPrefix = newPrefix;
            saveUserData();

            const embed = new MessageEmbed()
                .setColor('#00FF00')
                .setTitle('Prefix Changed')
                .setDescription(`The prefix has been changed to: ${newPrefix}`)
                .setTimestamp();

            message.author.send({ embeds: [embed] });
        } else {
            message.author.send('Invalid prefix. Only one special character is allowed.');
        }
    }
});

async function setup({ adminRolesList, dumpInfoChannel, auditChannelID, logChannelID }) {
    adminRoles = adminRolesList;
    dumpChannel = await client.channels.fetch(dumpInfoChannel);
    auditChannel = await client.channels.fetch(auditChannelID);
    logChannel = await client.channels.fetch(logChannelID);

    const setupEmbed = new MessageEmbed()
        .setColor('#0000FF')
        .setTitle('Bot Setup Complete')
        .setDescription('The bot has been successfully configured with the necessary settings.')
        .addFields(
            { name: 'Admin Roles', value: adminRoles.join(', ') },
            { name: 'Dump Info Channel', value: dumpChannel.name },
            { name: 'Audit Channel', value: auditChannel.name },
            { name: 'Logging Channel', value: logChannel.name }
        )
        .setTimestamp();

    await auditChannel.send({ embeds: [setupEmbed] });
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    loadUserData();
});

setup({
    adminRolesList: ['Admin', 'Moderator'],
    dumpInfoChannel: 'CHANNEL_ID_FOR_DUMP',
    auditChannelID: 'CHANNEL_ID_FOR_AUDIT',
    logChannelID: 'CHANNEL_ID_FOR_LOGGING'
});

const botToken = process.env.BOT_API_KEY;
client.login(botToken);
