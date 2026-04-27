import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('GLEECIN Assistant — Help')
      .setDescription('Complete command reference for all features')
      .setColor('#00ff88')
      .addFields(
        {
          name: '🎫 Ticket System',
          value: '`/ticket open <category> <description>` — Open a support ticket\n`/ticket close [reason]` — Close current ticket\n`/ticket reopen` — Reopen a closed ticket'
        },
        {
          name: '💬 Community',
          value: '`/ping` — Check bot status\n`/welcome setup <visitor_role> <member_role>` — Setup welcome system\n`/channels setup` — Configure channel behaviors'
        },
        {
          name: '📚 Scripting Academy',
          value: '`/class enroll` — Enroll in Scripting Academy\n`/class schedule` — View class times and dates\n`/class curriculum` — View course content\n`/class resources` — Access learning materials'
        },
        {
          name: '🐛 Debugging & Support',
          value: '`/debug <issue> [error] [code] [priority]` — Report a bug or get help\n`/class announce <message>` — Post class announcement (instructor)'
        },
        {
          name: '⭐ Student Showcase',
          value: '`/showcase submit <project_name> <description> [github] [demo]` — Submit your project\n`/showcase list` — View all student projects'
        },
        {
          name: '🌐 Channel Info',
          value: '`/channelinfo setup <channel> <type>` — Add channel information (admin)'
        }
      )
      .addFields(
        {
          name: '📋 Ticket Categories',
          value: '🆘 Support • 🎨 Commission • 🐛 Bug Report • ❓ Service Inquiry • ⚙️ Technical Issue'
        },
        {
          name: '💡 Quick Tips',
          value: '• Use `/ticket` for any inquiries\n• Check `/class schedule` for important dates\n• Submit projects in `/showcase submit`\n• Get debug help with `/debug`'
        }
      )
      .setFooter({ text: 'Need more help? Open a support ticket!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};