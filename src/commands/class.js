import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('class')
    .setDescription('Jwett Scripting Academy commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enroll')
        .setDescription('Enroll in the Scripting Academy')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('schedule')
        .setDescription('View class schedule and important dates')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('curriculum')
        .setDescription('View course curriculum and learning modules')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('announce')
        .setDescription('Post a class announcement (instructor only)')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Announcement message')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('resources')
        .setDescription('Access curriculum resources and documentation')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'enroll') {
      await handleEnroll(interaction);
    } else if (subcommand === 'schedule') {
      await handleSchedule(interaction);
    } else if (subcommand === 'curriculum') {
      await handleCurriculum(interaction);
    } else if (subcommand === 'announce') {
      await handleAnnounce(interaction);
    } else if (subcommand === 'resources') {
      await handleResources(interaction);
    }
  }
};

async function handleEnroll(interaction) {
  const studentRoleId = process.env.STUDENT_ROLE_ID;

  if (!studentRoleId) {
    return interaction.reply({
      content: '❌ Student role not configured.',
      ephemeral: true
    });
  }

  try {
    const member = interaction.member;
    const hasStudentRole = member.roles.cache.has(studentRoleId);

    if (hasStudentRole) {
      return interaction.reply({
        content: '✅ You\'re already enrolled in the Scripting Academy!',
        ephemeral: true
      });
    }

    await member.roles.add(studentRoleId);

    const enrollEmbed = new EmbedBuilder()
      .setTitle('🎓 Welcome to Scripting Academy!')
      .setDescription('You have been enrolled in the Jwett Scripting Academy.')
      .setColor('#0099ff')
      .addFields(
        { name: '📅 Class Starts', value: 'May 1st, 2026', inline: true },
        { name: '📍 Main Hub', value: 'Check #class-updates for announcements', inline: true },
        { name: '🔗 Quick Links', value: 'Use `/class schedule` for class times\nUse `/class curriculum` for course content\nUse `/class resources` for materials' }
      )
      .setFooter({ text: 'Ready to level up your scripting skills!' })
      .setTimestamp();

    await interaction.reply({ embeds: [enrollEmbed], ephemeral: true });

    // Optional: Send to class channel
    const classChannelId = process.env.CLASS_UPDATES_CHANNEL_ID;
    if (classChannelId) {
      const channel = await interaction.guild.channels.fetch(classChannelId).catch(() => null);
      if (channel) {
        const joinEmbed = new EmbedBuilder()
          .setTitle('👤 New Student Enrolled')
          .setDescription(`${interaction.user.username} has joined the Scripting Academy!`)
          .setColor('#00ff88')
          .setTimestamp();
        await channel.send({ embeds: [joinEmbed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[ENROLL ERROR]', error);
    await interaction.reply({ content: 'Failed to enroll. Please contact an administrator.', ephemeral: true });
  }
}

async function handleSchedule(interaction) {
  const scheduleEmbed = new EmbedBuilder()
    .setTitle('📅 Scripting Academy Schedule')
    .setColor('#0099ff')
    .addFields(
      {
        name: '🚀 Class Start Date',
        value: '**May 1st, 2026** — Kickoff Session\n• Introduction to course\n• Setup and environment configuration\n• Community introduction'
      },
      {
        name: '📚 Class Sessions',
        value: '**Tuesdays & Thursdays**\n• 6:00 PM - 8:00 PM EST\n• Live coding sessions\n• Q&A and discussion'
      },
      {
        name: '💪 Lab Hours',
        value: '**Sundays**\n• 2:00 PM - 4:00 PM EST\n• Hands-on practice\n• Instructor office hours\n• Peer review sessions'
      },
      {
        name: '📆 Important Dates',
        value: '• **May 1st** — Class Begins\n• **May 15th** — First Assignment Due\n• **June 1st** — Midpoint Review\n• **June 15th** — Final Project Due\n• **June 22nd** — Graduation & Showcase'
      },
      {
        name: '🎯 Course Length',
        value: '**7 Weeks** — Beginner to Intermediate Scripting'
      },
      {
        name: '❓ Need Help With Scheduling?',
        value: 'Use `/ticket open inquiry` to request accommodations'
      }
    )
    .setFooter({ text: 'All times are EST' })
    .setTimestamp();

  await interaction.reply({ embeds: [scheduleEmbed], ephemeral: true });
}

async function handleCurriculum(interaction) {
  const curriculumEmbed = new EmbedBuilder()
    .setTitle('📖 Scripting Academy Curriculum')
    .setColor('#0099ff')
    .setDescription('Comprehensive 7-week scripting course\n')
    .addFields(
      {
        name: '**Week 1: Fundamentals**',
        value: '🎯 Core Concepts\n• Variables and data types\n• Control flow (if/else, loops)\n• Functions and scope\n• Debugging basics'
      },
      {
        name: '**Week 2: Intermediate Concepts**',
        value: '🔧 Advanced Structures\n• Objects and arrays\n• Error handling\n• Callbacks and promises\n• Async/await introduction'
      },
      {
        name: '**Week 3: DOM & Interaction**',
        value: '⚡ Web Integration\n• DOM manipulation\n• Event handling\n• Dynamic content\n• User input validation'
      },
      {
        name: '**Week 4: APIs & Data**',
        value: '🌐 External Integration\n• REST API calls\n• JSON handling\n• Data parsing\n• External library usage'
      },
      {
        name: '**Week 5: Project Development**',
        value: '🏗️ Building Real Projects\n• Project structure\n• Module organization\n• Testing practices\n• Optimization techniques'
      },
      {
        name: '**Week 6: Advanced Topics**',
        value: '🚀 Next Level Skills\n• Performance optimization\n• Security best practices\n• Deployment basics\n• Version control (Git)'
      },
      {
        name: '**Week 7: Capstone Project**',
        value: '🎓 Final Project\n• Plan your project\n• Implementation\n• Testing and debugging\n• Presentation preparation'
      }
    )
    .setFooter({ text: 'Use `/class resources` for detailed materials' })
    .setTimestamp();

  await interaction.reply({ embeds: [curriculumEmbed], ephemeral: true });
}

async function handleResources(interaction) {
  const resourceEmbed = new EmbedBuilder()
    .setTitle('📚 Course Resources & Materials')
    .setColor('#0099ff')
    .addFields(
      {
        name: '📖 Learning Materials',
        value: '• Course documentation in #resources-and-curriculum\n• Code examples and templates\n• Video tutorials and recorded sessions\n• Interactive coding playground'
      },
      {
        name: '💻 Development Tools',
        value: '• **VS Code** — Recommended IDE\n• **Node.js** — JavaScript runtime\n• **Git** — Version control\n• **Discord Bot API** — Our focus'
      },
      {
        name: '📝 Assignment Submissions',
        value: '📤 Submit to: #assignments\n• Use the assignment template\n• Include documentation\n• Explain your approach'
      },
      {
        name: '🤝 Getting Help',
        value: '• **#live-discussion** — Real-time chat during class\n• **#debug-support** — Post errors and get help\n• **Office Hours** — Sundays 2-4 PM EST\n• Use `/debug` command for technical issues'
      },
      {
        name: '🌟 Showcase Your Work',
        value: '• **#student-showcase** — Share completed projects\n• Get feedback from peers\n• Build your portfolio\n• Celebrate milestones!'
      },
      {
        name: '📚 External Resources',
        value: '• [MDN Web Docs](https://developer.mozilla.org)\n• [Discord.js Guide](https://discordjs.guide)\n• [JavaScript.info](https://javascript.info)\n• [FreeCodeCamp Tutorials](https://freecodecamp.org)'
      }
    )
    .setFooter({ text: 'All resources linked in #resources-and-curriculum channel' })
    .setTimestamp();

  const resourceButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('📚 View Resources Channel')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/channels/@me'),
    new ButtonBuilder()
      .setCustomId('get_debug_help')
      .setLabel('🐛 Report Debug Issue')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ embeds: [resourceEmbed], components: [resourceButtons], ephemeral: true });
}

async function handleAnnounce(interaction) {
  const message = interaction.options.getString('message');

  try {
    const classChannelId = process.env.CLASS_UPDATES_CHANNEL_ID;
    if (!classChannelId) {
      return interaction.reply({
        content: '❌ Class updates channel not configured.',
        ephemeral: true
      });
    }

    const channel = await interaction.guild.channels.fetch(classChannelId).catch(() => null);
    if (!channel) {
      return interaction.reply({
        content: '❌ Could not find class updates channel.',
        ephemeral: true
      });
    }

    const announceEmbed = new EmbedBuilder()
      .setTitle('📢 Class Announcement')
      .setDescription(message)
      .setColor('#ff9900')
      .setFooter({ text: `Posted by ${interaction.user.username}` })
      .setTimestamp();

    await channel.send({ content: '@here', embeds: [announceEmbed] });

    await interaction.reply({
      content: `✅ Announcement posted to ${channel}`,
      ephemeral: true
    });
  } catch (error) {
    console.error('[ANNOUNCE ERROR]', error);
    await interaction.reply({
      content: 'Failed to post announcement.',
      ephemeral: true
    });
  }
}
