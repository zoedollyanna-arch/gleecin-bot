import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder, Client, EmbedBuilder, GatewayIntentBits } from 'discord.js';

const channelId = '1533955054699020308';
const studentId = '730181638704726118';
const documentPath = 'C:\\Users\\Shadow\\Desktop\\scripting class 2\\📚 Gleecin Academy – Homework Assignment.docx';

if (!fs.existsSync(documentPath)) {
  console.error(`❌ Attachment not found: ${documentPath}`);
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const embed = new EmbedBuilder()
  .setTitle('📚 Gleecin Academy Homework: Mommy & Baby HUD')
  .setDescription('A friendly instructor summary of the assignment. The attached document contains the full homework details and checklist.')
  .setColor(3447003)
  .addFields(
    {
      name: 'Assignment Goal',
      value: 'Debug the HUD, connect it to Supabase, deploy the backend on Render, and ensure persistent baby/profile data across resets, crashes, redelivery, and relogs.'
    },
    {
      name: 'Core Tasks',
      value: '1. Debug HUD button/prim mapping and touch events\n2. Set up Supabase schema, migrations, and policies\n3. Verify Render deployment with no build/log errors\n4. Persist baby stats and settings in Supabase\n5. Create .env.example and configure Render env vars\n6. Run curl/integration tests for API create/update/read\n7. Confirm persistence through resets, restarts, and redelivery\n8. Test in-world and document bugs with expected behavior'
    },
    {
      name: 'Deliverables',
      value: 'Complete the Homework Checklist, verify backend and Supabase functionality, and confirm in-world testing results.'
    },
    {
      name: 'Document Attached',
      value: '📎 Gleecin Academy – Homework Assignment.docx'
    }
  )
  .setFooter({ text: 'Instructor-friendly summary for student ticket 1533955054699020308' });

const attachment = new AttachmentBuilder(documentPath, {
  name: path.basename(documentPath)
});

async function main() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is not defined in .env');
    process.exit(1);
  }

  await client.login(process.env.DISCORD_TOKEN);

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      console.error(`❌ Channel ${channelId} not found or is not a text-based channel.`);
      process.exit(1);
    }

    const message = await channel.send({
      content: `<@${studentId}> 👋 Here is your homework assignment. The attached document is below, and the summary is included in the embed for quick review.`,
      embeds: [embed],
      files: [attachment]
    });

    console.log(`✅ Homework assignment posted to channel ${channelId}. Message ID: ${message.id}`);
  } catch (error) {
    console.error('❌ Failed to post the homework assignment:', error);
    process.exit(1);
  } finally {
    await client.destroy();
  }
}

main();
