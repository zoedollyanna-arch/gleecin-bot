import { Events, EmbedBuilder } from 'discord.js';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Ignore bot messages
    if (message.author.bot) return;

    const channelId = message.channel.id;
    const generalChannelId = process.env.GENERAL_CHANNEL_ID;
    const galleryChannelId = process.env.GALLERY_CHANNEL_ID;
    const reviewsChannelId = process.env.REVIEWS_CHANNEL_ID;
    const supportChannelId = process.env.SUPPORT_CHANNEL_ID;
    const clientRoleId = process.env.CLIENT_ROLE_ID;

    // #general-chat - Auto filter and pricing responses
    if (channelId === generalChannelId) {
      await handleGeneralChat(message, client);
    }

    // #gleecin-gallery - Images only with auto reactions
    if (channelId === galleryChannelId) {
      await handleGallery(message, client);
    }

    // #client-reviews - Auto reactions and client verification
    if (channelId === reviewsChannelId) {
      await handleReviews(message, client);
    }

    // #help-and-support - Auto guidance message
    if (channelId === supportChannelId) {
      await handleSupport(message, client);
    }
  }
};

async function handleGeneralChat(message, client) {
  const content = message.content.toLowerCase();
  
  // Check for pricing keywords
  const pricingKeywords = ['price', 'cost', 'how much'];
  const hasPricingKeyword = pricingKeywords.some(keyword => content.includes(keyword));

  if (hasPricingKeyword) {
    const pricingEmbed = new EmbedBuilder()
      .setTitle('💰 GLEECIN Pricing Information')
      .setDescription('Our pricing varies by service and scope. For detailed pricing information:\n\n📋 **Check our website** for current packages\n💬 **Contact our team** for custom quotes\n🎫 **Open a support ticket** for specific inquiries')
      .setColor('#gold')
      .addFields(
        { name: '🚀 Quick Quote', value: 'Use `/ticket` to get a personalized quote for your project.' },
        { name: '📧 Business Inquiries', value: 'DM our team or use the contact form on our website.' }
      )
      .setTimestamp();

    await message.reply({ embeds: [pricingEmbed] });
  }

  // Auto filter banned words (basic implementation)
  const bannedWords = process.env.BANNED_WORDS?.split(',') || [];
  const hasBannedWord = bannedWords.some(word => content.includes(word.toLowerCase()));

  if (hasBannedWord) {
    await message.delete();
    await message.channel.send({
      content: `⚠️ ${message.author}, your message was removed for inappropriate content. Please review our community guidelines.`
    });
  }
}

async function handleGallery(message, client) {
  // Check if message contains images or attachments
  const hasImages = message.attachments.size > 0 || 
                   message.embeds.some(embed => embed.image) ||
                   message.content.match(/https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/gi);

  if (hasImages) {
    // Auto react with ⭐🔥
    await message.react('⭐');
    await message.react('🔥');
  } else {
    // Delete non-media content
    await message.delete();
    await message.channel.send({
      content: `📸 ${message.author}, this channel is for images only! Please share your visual content here.`
    });
  }
}

async function handleReviews(message, client) {
  const clientRoleId = process.env.CLIENT_ROLE_ID;
  
  // Auto react with 👑
  await message.react('👑');

  // Check if user has Client role
  if (message.member.roles.cache.has(clientRoleId)) {
    const verifiedEmbed = new EmbedBuilder()
      .setTitle('⭐ Verified Client Review')
      .setDescription('Thank you for trusting GLEECIN!')
      .setColor('#gold')
      .setFooter({ text: 'Verified Client' });

    await message.reply({ embeds: [verifiedEmbed] });
  }
}

async function handleSupport(message, client) {
  // Auto guidance message (limit to avoid spam)
  const supportMessages = [
    "This channel is for quick questions.",
    "For structured help, use #open-support-ticket."
  ];
  
  // Only send if it's not a reply and not from staff
  if (!message.reference && !message.member.permissions.has('ManageMessages')) {
    const guidanceEmbed = new EmbedBuilder()
      .setTitle('💡 Need Help?')
      .setDescription(`${supportMessages.join('\n\n')}`)
      .setColor('#00ff88')
      .addFields(
        { name: '🎫 Quick Support', value: 'Use `/ticket` to create a private support channel for detailed assistance.' },
        { name: '📚 Resources', value: 'Check our pinned messages for FAQs and common solutions.' }
      )
      .setTimestamp();

    await message.reply({ embeds: [guidanceEmbed] });
  }
}
