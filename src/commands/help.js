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
          name: '🎫 Tickets',
          value:
            '`/ticket close [reason]` — Close the ticket you are in\n' +
            '`/ticket open <user> <category>` — Open one on a member\'s behalf (staff)\n' +
            '`/ticket panel <type>` — Post an intake panel (staff)\n' +
            '`/ticket list` · `/ticket stats` · `/ticket history` — (staff)'
        },
        {
          name: '💬 Community',
          value: '`/ping` — Check bot status\n`/welcome setup <visitor_role> <member_role>` — Setup welcome system\n`/channels setup` — Configure channel behaviors'
        },
        {
          name: '📚 Scripting Academy',
          value:
            '`/class desk` — **Student Desk** — code review, homework, debugging, office hours\n' +
            '`/class apply` — Apply to the Academy\n' +
            '`/class schedule` — View class times and dates\n' +
            '`/class curriculum` — View course content\n' +
            '`/class resources` — Access learning materials'
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
          name: '📋 Ticket Types',
          value:
            '🎨 Commission • 🆘 Support • 🎓 Class application • 📚 Student Desk\n' +
            '_Student Desk:_ 💻 Code Review • 🔍 Debug • 🚀 Project Assistance • ' +
            '📋 Assignment Review • ✅ Progress Check-In • ☕ Office Hours • 🎯 Mentorship'
        },
        {
          name: '💡 Quick Tips',
          value: '• Students: `/class desk` is the fastest way to reach your instructor\n• Check `/class schedule` for important dates\n• Submit projects in `/showcase submit`'
        }
      )
      .setFooter({ text: 'Need more help? Open a support ticket!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};