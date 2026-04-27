import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Add informational messages to channels with typing indicator')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup channel information messages')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Target channel')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of information')
            .setRequired(true)
            .addChoices(
              { name: 'General Chat Info', value: 'general' },
              { name: 'Gallery Rules', value: 'gallery' },
              { name: 'Reviews Guide', value: 'reviews' },
              { name: 'Support Instructions', value: 'support' },
              { name: 'Services Overview', value: 'services' },
              { name: 'Pricing Info', value: 'pricing' }
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      await handleSetup(interaction);
    }
  }
};

async function handleSetup(interaction) {
  const channel = interaction.options.getChannel('channel');
  const infoType = interaction.options.getString('type');

  const channelInfos = {
    general: {
      title: '💬 General Chat',
      description: 'Welcome to the main discussion hub!',
      content: `This is where GLEECIN community connects. Share ideas, ask questions, and collaborate on projects.

**Guidelines:**
• Be respectful and constructive
• Keep conversations on-topic
• No spam or self-promotion without permission
• Use threads for longer discussions

**Quick Links:**
• 📋 [Service Details](https://gleecin.com/services)
• 💰 [Pricing](https://gleecin.com/pricing)
• 🎫 Use \`/ticket\` for inquiries`,
      color: '#00ff88'
    },
    gallery: {
      title: '📸 GLEECIN Gallery',
      description: 'Showcase your visual content here',
      content: `This channel is **images only** — share your best work!

**What To Share:**
✅ Screenshots, renders, artwork
✅ Product photos
✅ Design showcases
✅ Portfolio pieces

**What NOT To Share:**
❌ Text-only messages
❌ Links without images
❌ Off-topic content

*Images get auto-reactions from our community!*`,
      color: '#ff00ff'
    },
    reviews: {
      title: '⭐ Client Reviews',
      description: 'Verified client testimonials and feedback',
      content: `Share your experience working with GLEECIN!

**For Verified Clients:**
Your reviews get a 👑 badge of authenticity.

**What Makes A Great Review:**
✨ Honest feedback about your experience
📝 Specific details about what we delivered
📊 Rating and recommendation
💬 Constructive suggestions

Thank you for supporting GLEECIN!`,
      color: '#ffff00'
    },
    support: {
      title: '🆘 Help & Support',
      description: 'Get assistance from our team',
      content: `Need help? We're here for you!

**Support Options:**
1. 📋 **Open a Ticket** — Use \`/ticket open support\` for quick assistance
2. 💬 **Chat Here** — Ask questions directly
3. 📖 **Check Resources** — See our documentation
4. 🔧 **Technical Help** — Use \`/debug\` for technical issues

**Response Time:** Usually within 24 hours
**Business Hours:** Monday - Friday, 9 AM - 6 PM EST`,
      color: '#ff9900'
    },
    services: {
      title: '🚀 Our Services',
      description: 'Explore what GLEECIN offers',
      content: `GLEECIN specializes in:

**🎮 Game Development & RP Systems**
Custom configurations, automation, and infrastructure

**🛍️ Retail & E-Commerce**
Storefront design, product management, integrations

**👗 Fashion & Digital Goods**
Clothing lines, limited releases, digital fashion

**⚙️ Infrastructure & Automation**
Backend systems, bot integration, workflow optimization

**📱 Consultation & Strategy**
Project planning, technical guidance, full implementation

👉 Use \`/ticket open inquiry\` for a custom quote!`,
      color: '#0099ff'
    },
    pricing: {
      title: '💰 Pricing Information',
      description: 'Transparent pricing for all services',
      content: `Our pricing is **flexible and scalable**:

**Starter Packages:** Starting at $500
• Perfect for small projects
• Basic setup and configuration

**Professional Services:** $1,500 - $5,000
• Custom development
• Advanced integrations
• Support included

**Enterprise Solutions:** Custom pricing
• Full custom builds
• Dedicated support
• Ongoing maintenance

🎯 **Every project is unique!**
Use \`/ticket open inquiry\` to get a personalized quote.

📧 **Contact us:** DM team or visit gleecin.com`,
      color: '#gold'
    }
  };

  const info = channelInfos[infoType];
  if (!info) {
    return interaction.reply({ content: 'Invalid information type.', ephemeral: true });
  }

  try {
    // Show typing indicator
    await channel.sendTyping();
    
    // Wait a bit for effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    const embed = new EmbedBuilder()
      .setTitle(info.title)
      .setDescription(info.description)
      .addFields(
        { name: 'ℹ️ Information', value: info.content }
      )
      .setColor(info.color)
      .setFooter({ text: 'GLEECIN Bot Helper' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Channel Info Added')
      .setDescription(`Information message posted to ${channel}`)
      .setColor('#00ff88')
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
  } catch (error) {
    console.error('[CHANNELINFO ERROR]', error);
    await interaction.reply({ content: 'Failed to post information. Check permissions.', ephemeral: true });
  }
}
