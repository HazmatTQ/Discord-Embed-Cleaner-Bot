require('dotenv').config({ path: './secret.env' });
const { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const MOD_LOG_CHANNEL_ID = process.env.MOD_LOG_CHANNEL_ID; // optional

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: 'Cleaning failed embeds', type: ActivityType.Watching }],
        status: 'idle'
    });
});

const { PermissionsBitField } = require('discord.js');

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Check if user has Embed Links permission
    const canEmbed = message.channel.permissionsFor(message.member)?.has(PermissionsBitField.Flags.EmbedLinks);
    if (canEmbed) return; // skip if they can embed

    // GIF URL regex for popular hosts
    const urlRegex = /(https?:\/\/(?:tenor\.com|giphy\.com|i\.imgur\.com|imgur\.com|redgifs\.com|gifbin\.com)\/[^\s]+)/i;

    // Discord CDN GIF regex
    const discordCdnGifRegex = /https?:\/\/media\.discordapp\.net\/attachments\/[^\s]+\.gif/gi;

    // check if message has GIF link
    const hasGifLink = urlRegex.test(message.content) || discordCdnGifRegex.test(message.content);

    // check if message has attachments
    const hasAttachment = message.attachments.size > 0;

    // check if any attachment is a GIF
    const hasGifAttachment = message.attachments.some(att => att.name?.toLowerCase().endsWith('.gif'));

    // check if message has embeds
    const hasEmbed = message.embeds.length > 0;

    // delete message if it fails and user cannot embed
    if ((hasGifLink && !hasEmbed) || (hasGifAttachment && !hasEmbed)) {
        try {
            await message.delete();
            console.log(`Deleted failed GIF/link from <@${message.author.id}>`);

            // notice message
            const noticeMessage = await message.channel.send({
                content: `<@${message.author.id}>, Your message has been removed because you do not have permission to send GIFs. GIF and attachment permissions are unlocked at **level 15**.`,
            });
            setTimeout(() => noticeMessage.delete().catch(() => {}), 10000);

            // log to mod channel
            if (MOD_LOG_CHANNEL_ID) {
                const modChannel = await message.guild.channels.fetch(MOD_LOG_CHANNEL_ID);
                if (modChannel && modChannel.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Deleted GIF/Link')
                        .setDescription(`A message containing a GIF or GIF link was removed.`)
                        .addFields(
                            { name: 'User', value: `<@${message.author.id}>`, inline: true },
                            { name: 'Channel', value: `${message.channel}`, inline: true },
                            { name: 'Message Content', value: message.content || '*No text content*' }
                        )
                        .setColor(0xe87b72)
                        .setTimestamp();
                    modChannel.send({ embeds: [logEmbed] });
                }
            }

        } catch (err) {
            console.error(`Failed to delete message: ${err}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);