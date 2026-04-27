import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Report a bug or get debugging help')
    .addStringOption(option =>
      option.setName('issue')
        .setDescription('Describe your bug or error')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('error_message')
        .setDescription('Exact error message (if applicable)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('code_snippet')
        .setDescription('Relevant code snippet (paste first 50 chars)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('priority')
        .setDescription('Severity level')
        .setRequired(false)
        .addChoices(
          { name: '🔴 Critical (code won\'t run)', value: 'critical' },
          { name: '🟠 High (major functionality broken)', value: 'high' },
          { name: '🟡 Medium (feature not working)', value: 'medium' },
          { name: '🟢 Low (minor issue)', value: 'low' }
        )
    ),

  async execute(interaction) {
    await handleDebugReport(interaction);
  }
};

async function handleDebugReport(interaction) {
  const issue = interaction.options.getString('issue');
  const errorMessage = interaction.options.getString('error_message') || 'No error message provided';
  const codeSnippet = interaction.options.getString('code_snippet') || 'No code snippet provided';
  const priority = interaction.options.getString('priority') || 'medium';
  const user = interaction.user;
  const guild = interaction.guild;

  if (!guild) {
    return interaction.reply({ content: 'This command only works in a server.', ephemeral: true });
  }

  const priorityIcons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };

  const debugChannelName = `🐛-debug-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

  try {
    const debugChannelId = process.env.DEBUG_SUPPORT_CHANNEL_ID;
    const studentRoleId = process.env.STUDENT_ROLE_ID;
    const instructorRoleId = process.env.INSTRUCTOR_ROLE_ID;

    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ];

    // Add student role if exists
    if (studentRoleId) {
      permissionOverwrites.push({
        id: studentRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    // Add instructor role if exists
    if (instructorRoleId) {
      permissionOverwrites.push({
        id: instructorRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
      });
    }

    // Create private debug channel
    const debugChannel = await guild.channels.create({
      name: debugChannelName,
      type: ChannelType.GuildText,
      permissionOverwrites
    });

    // Create detailed debug report
    const debugReport = new EmbedBuilder()
      .setTitle(`${priorityIcons[priority]} Debug Report — ${priority.toUpperCase()}`)
      .setColor(getPriorityColor(priority))
      .addFields(
        {
          name: '📋 Issue Description',
          value: issue,
          inline: false
        },
        {
          name: '⚠️ Error Message',
          value: `\`\`\`\n${errorMessage}\n\`\`\``,
          inline: false
        },
        {
          name: '💻 Code Snippet',
          value: `\`\`\`javascript\n${codeSnippet}\n\`\`\``,
          inline: false
        },
        {
          name: '👤 Student',
          value: `${user.tag} (${user.id})`,
          inline: true
        },
        {
          name: '🎓 Status',
          value: '⏳ Waiting for assistance',
          inline: true
        }
      )
      .setFooter({ text: `Debug Channel ID: ${debugChannel.id}` })
      .setTimestamp();

    // Debugging checklist
    const checklistEmbed = new EmbedBuilder()
      .setTitle('🔍 Debugging Checklist')
      .setDescription('To help us help you faster, please verify:')
      .setColor('#0099ff')
      .addFields(
        { name: '✅ Before Posting', value: '• Check console for errors\n• Google the error message\n• Search Stack Overflow\n• Review your recent changes' },
        { name: '📸 Share With Us', value: '• Full error trace\n• Relevant code sections\n• What you tried\n• Expected vs actual result' },
        { name: '⏱️ Response Time', value: 'Instructors check debug channel every 12-24 hours\nPeers may help sooner in #live-discussion' }
      )
      .setColor('#ffff00');

    // Helpful resources button
    const resourceRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📚 Debugging Guide')
        .setStyle(ButtonStyle.Link)
        .setURL('https://developer.mozilla.org/en-US/docs/Tools/Debugger'),
      new ButtonBuilder()
        .setLabel('💬 Discussion Channel')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('go_to_discussion')
    );

    await debugChannel.send({
      content: `<@${user.id}>`,
      embeds: [debugReport, checklistEmbed],
      components: [resourceRow]
    });

    // Send update message
    const solveButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mark_solved_${debugChannel.id}`)
        .setLabel('✅ Mark Solved')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`close_debug_${debugChannel.id}`)
        .setLabel('🔒 Close Channel')
        .setStyle(ButtonStyle.Danger)
    );

    await debugChannel.send({
      embeds: [{
        title: '📌 Channel Management',
        description: 'Use these buttons when your issue is resolved:',
        color: 0x0099ff
      }],
      components: [solveButton]
    });

    // Reply to user
    const replyEmbed = new EmbedBuilder()
      .setTitle('✅ Debug Report Submitted')
      .setDescription(`Your debug channel has been created: ${debugChannel}`)
      .setColor('#00ff88')
      .addFields(
        { name: '📍 Next Steps', value: '1. Join your debug channel\n2. Provide detailed information\n3. Wait for instructor assistance\n4. Mark as solved when fixed' },
        { name: '💡 Pro Tips', value: '• Include complete error messages\n• Share your entire relevant function\n• Explain what you expected\n• Tell us what you\'ve already tried' }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [replyEmbed], ephemeral: true });

    // Post to debug-support channel if it exists
    if (debugChannelId) {
      const mainDebugChannel = await guild.channels.fetch(debugChannelId).catch(() => null);
      if (mainDebugChannel) {
        const notificationEmbed = new EmbedBuilder()
          .setTitle(`${priorityIcons[priority]} New Debug Report`)
          .setDescription(`**Student:** ${user.tag}\n**Priority:** ${priority.toUpperCase()}\n**Issue:** ${issue.substring(0, 100)}...`)
          .setColor(getPriorityColor(priority))
          .addFields({
            name: '🔗 Debug Channel',
            value: `${debugChannel}`
          })
          .setTimestamp();

        await mainDebugChannel.send({ embeds: [notificationEmbed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[DEBUG ERROR]', error);
    await interaction.reply({
      content: '❌ Failed to create debug channel. Please try again or contact an instructor.',
      ephemeral: true
    });
  }
}

function getPriorityColor(priority) {
  const colors = {
    critical: '#ff0000',
    high: '#ff9900',
    medium: '#ffff00',
    low: '#00ff00'
  };
  return colors[priority] || '#0099ff';
}
