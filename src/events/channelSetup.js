import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  
  async execute(client) {
    console.log('[CHANNEL SETUP] Setting up branded channel messages...');
    
    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
    if (!guild) {
      console.log('[CHANNEL SETUP] Guild not found');
      return;
    }

    // Setup #brand-info channel
    await setupBrandInfoChannel(guild);
    
    // Setup #community-standards channel
    await setupCommunityStandardsChannel(guild);
    
    console.log('[CHANNEL SETUP] ✅ Channel setup complete');
  }
};

async function setupBrandInfoChannel(guild) {
  // Find the brand-info channel - adjust the channel name as needed
  const brandChannels = guild.channels.cache.filter(c => c.name.includes('brand'));
  
  if (brandChannels.size === 0) {
    console.log('[BRAND-INFO] No brand info channel found. Skipping.');
    return;
  }

  const channel = brandChannels.first();

  // Check if message already exists (by looking for pinned messages or specific content)
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => []);
  const hasSetup = messages.some(m => m.content.includes('GLEECIN Academy'));
  
  if (hasSetup) {
    console.log('[BRAND-INFO] Setup message already exists. Skipping.');
    return;
  }

  try {
    const brandEmbed = new EmbedBuilder()
      .setTitle('🎓 Welcome to GLEECIN Academy')
      .setDescription('Premium Digital Scripting Education & Creative Marketplace')
      .setColor('#00ff88')
      .addFields(
        {
          name: '📚 What We Offer',
          value: '**Scripting Academy** — Comprehensive courses from beginner to advanced\n**Retail Marketplace** — Premium scripts, skins, and digital assets\n**Interactive Systems** — Custom tools, HUDs, vendors, and automation\n**Creative Services** — Commission work and portfolio building'
        },
        {
          name: '🎯 Our Mission',
          value: 'Empower creators with professional scripting knowledge and premium digital tools. Whether you\'re learning to code or selling your creations, GLEECIN is your launchpad.'
        },
        {
          name: '🌐 Explore Our Ecosystem',
          value: '🛍️ **[Visit Marketplace](https://gleecin.com/marketplace)** — Browse and purchase scripts, systems, and assets\n📚 **[Academy Portal](https://gleecin.com/academy)** — Enroll in classes and access learning materials\n💼 **[Commission Services](https://gleecin.com/commissions)** — Hire our team for custom projects'
        },
        {
          name: '🚀 Get Started',
          value: 'Use `/class enroll` to join the Scripting Academy\nUse `/ticket open support` for any questions\nBrowse the marketplace for premium digital assets'
        }
      )
      .setFooter({ text: 'GLEECIN • Premium Digital Academy & Marketplace' })
      .setTimestamp();

    const brandButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🎓 Enroll in Academy')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('enroll_class'),
      new ButtonBuilder()
        .setLabel('🛍️ Visit Marketplace')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('visit_marketplace')
    );

    await channel.send({ embeds: [brandEmbed], components: [brandButtons] });
    console.log('[BRAND-INFO] ✅ Brand info message sent');
  } catch (error) {
    console.error('[BRAND-INFO ERROR]', error);
  }
}

async function setupCommunityStandardsChannel(guild) {
  // Find the community-standards channel
  const standardsChannels = guild.channels.cache.filter(c => c.name.includes('community') || c.name.includes('standards'));
  
  if (standardsChannels.size === 0) {
    console.log('[COMMUNITY STANDARDS] No community standards channel found. Skipping.');
    return;
  }

  const channel = standardsChannels.first();

  // Check if message already exists
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => []);
  const hasSetup = messages.some(m => m.content.includes('Community Standards'));
  
  if (hasSetup) {
    console.log('[COMMUNITY STANDARDS] Setup message already exists. Skipping.');
    return;
  }

  try {
    const standardsEmbed = new EmbedBuilder()
      .setTitle('📋 Community Standards & Expectations')
      .setDescription('GLEECIN Academy is a professional learning and creative community. Please review our standards.')
      .setColor('#ff9900')
      .addFields(
        {
          name: '✅ Expected Behavior',
          value: '• **Respectful Communication** — Treat all members with kindness and professionalism\n• **Professional Atmosphere** — This is an academy and marketplace, not a casual chat\n• **Constructive Feedback** — Offer helpful critique to fellow learners\n• **Follow Guidelines** — Respect channel purposes and moderator instructions'
        },
        {
          name: '❌ Not Permitted',
          value: '• Harassment, discrimination, or hate speech\n• Spam, self-promotion without permission\n• Sharing copyrighted code or assets without license\n• Sharing credentials or sensitive information\n• Off-topic discussions in academy channels'
        },
        {
          name: '🛡️ Our Marketplace Integrity',
          value: 'All scripts and assets sold through GLEECIN are:\n• **Licensed** — Proper usage rights included\n• **Tested** — Quality assured before sale\n• **Supported** — Technical support available\n• **Legal** — Comply with all platform terms of service'
        },
        {
          name: '🎓 Classroom Etiquette',
          value: '• Arrive on time to class sessions\n• Mute yourself when not speaking\n• Keep discussions on-topic\n• Ask questions respectfully\n• Respect instructor authority'
        },
        {
          name: '📞 Questions or Concerns?',
          value: 'Use `/ticket open inquiry` to report violations or discuss community matters with leadership.'
        }
      )
      .setFooter({ text: 'Thank you for being part of the GLEECIN community' })
      .setTimestamp();

    const standardsButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📞 Report Issue')
        .setStyle(ButtonStyle.Danger)
        .setCustomId('open_support'),
      new ButtonBuilder()
        .setLabel('💬 Get Help')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('open_support')
    );

    await channel.send({ embeds: [standardsEmbed], components: [standardsButtons] });
    console.log('[COMMUNITY STANDARDS] ✅ Community standards message sent');
  } catch (error) {
    console.error('[COMMUNITY STANDARDS ERROR]', error);
  }
}
