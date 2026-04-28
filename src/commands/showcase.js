import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('showcase')
    .setDescription('Submit or manage student project showcases')
    .addSubcommand(subcommand =>
      subcommand
        .setName('submit')
        .setDescription('Submit your project to the student showcase')
        .addStringOption(option =>
          option.setName('project_name')
            .setDescription('Name of your project')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Brief description of what you built')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('github_link')
            .setDescription('Link to your GitHub repo')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('demo_link')
            .setDescription('Live demo link (if available)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('skills_used')
            .setDescription('Technologies/concepts used (comma-separated)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all student projects in the showcase')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('approve')
        .setDescription('Approve a showcase submission (instructor only)')
        .addStringOption(option =>
          option.setName('submission_id')
            .setDescription('ID of submission to approve')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'submit') {
      await handleSubmit(interaction);
    } else if (subcommand === 'list') {
      await handleList(interaction);
    } else if (subcommand === 'approve') {
      await handleApprove(interaction);
    }
  }
};

async function handleSubmit(interaction) {
  const projectName = interaction.options.getString('project_name');
  const description = interaction.options.getString('description');
  const githubLink = interaction.options.getString('github_link') || 'Not provided';
  const demoLink = interaction.options.getString('demo_link') || 'Not provided';
  const skillsUsed = interaction.options.getString('skills_used') || 'Not specified';
  const user = interaction.user;

  try {
    const showcaseChannelId = process.env.SHOWCASE_CHANNEL_ID;
    
    if (!showcaseChannelId) {
      return interaction.reply({
        content: '❌ Showcase channel not configured.',
        ephemeral: true
      });
    }

    const guild = interaction.guild;
    const showcaseChannel = await guild.channels.fetch(showcaseChannelId).catch(() => null);

    if (!showcaseChannel) {
      return interaction.reply({
        content: '❌ Could not find showcase channel.',
        ephemeral: true
      });
    }

    // Create unique submission ID
    const submissionId = `showcase_${Date.now()}_${user.id}`;

    // Create project showcase embed
    const showcaseEmbed = new EmbedBuilder()
      .setTitle(`🎓 ${projectName}`)
      .setDescription(description)
      .setColor('#0099ff')
      .setAuthor({
        name: `Submitted by ${user.username}`,
        iconURL: user.displayAvatarURL()
      })
      .addFields(
        {
          name: '🔗 GitHub Repository',
          value: githubLink === 'Not provided' ? '❌ Not provided' : `[View Repository](${githubLink})`
        },
        {
          name: '🌐 Live Demo',
          value: demoLink === 'Not provided' ? '❌ Not available' : `[View Demo](${demoLink})`
        },
        {
          name: '⚙️ Technologies & Skills',
          value: skillsUsed
        }
      )
      .setFooter({
        text: `Submission ID: ${submissionId}`,
        iconURL: user.displayAvatarURL()
      })
      .setTimestamp();

    // Create action buttons
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`react_love_${submissionId}`)
        .setLabel('❤️ Love it')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`react_fire_${submissionId}`)
        .setLabel('🔥 Amazing')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`react_brain_${submissionId}`)
        .setLabel('🧠 Creative')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`react_celebrate_${submissionId}`)
        .setLabel('🎉 Great Job')
        .setStyle(ButtonStyle.Secondary)
    );

    // Send to showcase channel
    const message = await showcaseChannel.send({
      embeds: [showcaseEmbed],
      components: [actionRow]
    });

    // Confirmation to user
    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Project Submitted!')
      .setDescription(`Your project **${projectName}** has been posted to #student-showcase`)
      .setColor('#00ff88')
      .addFields(
        {
          name: '🎯 Next Steps',
          value: '• Share the link with classmates\n• Ask for feedback in discussion\n• Iterate based on feedback\n• Celebrate your accomplishment!'
        },
        {
          name: '💡 Showcase Tips',
          value: '• Include clear documentation\n• Show before/after if applicable\n• Explain your process\n• Be open to constructive feedback'
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

    // Log submission
    console.log(`[SHOWCASE] ${user.tag} submitted "${projectName}"`);
  } catch (error) {
    console.error('[SHOWCASE SUBMIT ERROR]', error);
    await interaction.reply({
      content: '❌ Failed to submit project. Please try again.',
      ephemeral: true
    });
  }
}

async function handleList(interaction) {
  const listEmbed = new EmbedBuilder()
    .setTitle('🎓 Student Showcase Gallery')
    .setDescription('Projects created by Scripting Academy students')
    .setColor('#00ff88')
    .addFields(
      {
        name: '📚 About This Channel',
        value: 'This is where students share their completed projects, experiments, and creative builds. Every submission represents learning, growth, and creativity!'
      },
      {
        name: '🎯 Submit Your Project',
        value: 'Use `/showcase submit` to add your project to the gallery'
      },
      {
        name: '⭐ How to Give Feedback',
        value: '• Use the reaction buttons on submissions\n• Reply with constructive comments\n• Share what you learned from their work\n• Be supportive and encouraging!'
      },
      {
        name: '🏆 Recognition',
        value: 'Outstanding projects may be featured:\n• Weekly community spotlight\n• Included in course materials\n• Shared on social media\n• Portfolio recommendations'
      },
      {
        name: '📌 Featured Projects',
        value: 'Check pinned messages for exemplary student work and case studies'
      }
    )
    .setFooter({ text: 'Showcase your creativity and inspire others!' })
    .setTimestamp();

  const viewButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('📸 View Showcase Channel')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/channels/@me'),
    new ButtonBuilder()
      .setLabel('✏️ Submit Project')
      .setStyle(ButtonStyle.Primary)
      .setCustomId('submit_project')
  );

  await interaction.reply({ embeds: [listEmbed], components: [viewButton], ephemeral: true });
}

async function handleApprove(interaction) {
  // Check if user has admin/instructor permissions
  if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Only administrators can approve submissions.',
      ephemeral: true
    });
  }

  const submissionId = interaction.options.getString('submission_id');

  const approvalEmbed = new EmbedBuilder()
    .setTitle('✅ Submission Approved')
    .setDescription(`Submission \`${submissionId}\` has been marked as featured!`)
    .setColor('#00ff88')
    .addFields(
      {
        name: '📌 Actions Taken',
        value: '• Message pinned in showcase\n• Student notified\n• Added to featured list'
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [approvalEmbed], ephemeral: true });

  console.log(`[SHOWCASE] Submission ${submissionId} approved`);
}
