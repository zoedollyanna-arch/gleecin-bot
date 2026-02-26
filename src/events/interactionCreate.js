import { Events } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'get_access') {
        await handleGetAccess(interaction, client);
      }
    }
  }
};

async function handleGetAccess(interaction, client) {
  const visitorRoleId = process.env.VISITOR_ROLE_ID;
  const memberRoleId = process.env.MEMBER_ROLE_ID;

  if (!visitorRoleId || !memberRoleId) {
    await interaction.reply({
      content: 'Access system not properly configured. Please contact an administrator.',
      ephemeral: true
    });
    return;
  }

  const member = interaction.member;
  const visitorRole = await member.guild.roles.fetch(visitorRoleId).catch(() => null);
  const memberRole = await member.guild.roles.fetch(memberRoleId).catch(() => null);

  if (!visitorRole || !memberRole) {
    await interaction.reply({
      content: 'Roles not found. Please contact an administrator.',
      ephemeral: true
    });
    return;
  }

  try {
    // Remove Visitor role
    if (member.roles.cache.has(visitorRoleId)) {
      await member.roles.remove(visitorRole);
    }

    // Add Member role
    await member.roles.add(memberRole);

    await interaction.reply({
      content: '🎉 **Access Granted!** Welcome to GLEECIN! You now have full member access.',
      ephemeral: true
    });

    // Optional: Log the access grant
    console.log(`[ACCESS] ${member.user.tag} (${member.user.id}) gained access to the server`);
  } catch (error) {
    console.error('[ACCESS ERROR]', error);
    await interaction.reply({
      content: 'There was an error granting access. Please contact an administrator.',
      ephemeral: true
    });
  }
}
