/**
 * Test Script: Simulate guildMemberAdd event
 * Shows the welcome embed and buttons that new members see
 */

import 'dotenv/config';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client
} from 'discord.js';

// Minimal mocks to let the event handler run without a real Discord connection
const mockMember = {
  user: {
    id: '123456789012345678',
    username: 'TestUser',
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
  },
  toString: () => '<@123456789012345678>',
  guild: {
    roles: {
      fetch: async () => ({
        id: process.env.VISITOR_ROLE_ID || '987654321098765432',
        name: 'Visitor'
      })
    }
  },
  roles: {
    add: async () => console.log('[MOCK] Visitor role assigned')
  }
};

const mockChannel = {
  send: async (payload) => {
    console.log('\n========== WELCOME MESSAGE OUTPUT ==========\n');

    if (payload.content) {
      console.log('📨 Mention:', payload.content);
    }

    if (payload.embeds?.length) {
      const embed = payload.embeds[0];
      console.log('\n--- Embed ---');
      console.log('📝 Title:', embed.data.title);
      console.log('🎨 Color:', '#' + embed.data.color?.toString(16).padStart(6, '0') || 'default');
      console.log('📄 Description:', embed.data.description);

      if (embed.data.fields?.length) {
        console.log('\n📋 Fields:');
        embed.data.fields.forEach((field, i) => {
          console.log(`  ${i + 1}. ${field.name}`);
          console.log(`     ${field.value}`);
        });
      }

      console.log('\n👣 Footer:', embed.data.footer?.text);
    }

    if (payload.components?.length) {
      console.log('\n--- Buttons ---');
      payload.components.forEach((row, rowIdx) => {
        console.log(`Row ${rowIdx + 1}:`);
        row.components.forEach((btn) => {
          const styleMap = {
            1: 'Primary (Blurple)',
            2: 'Secondary (Grey)',
            3: 'Success (Green)',
            4: 'Danger (Red)'
          };
          console.log(`  [${btn.data.emoji?.name || ''} ${btn.data.label}] → customId: "${btn.data.custom_id}" | Style: ${styleMap[btn.data.style] || btn.data.style}`);
        });
      });
    }

    console.log('\n========== END WELCOME MESSAGE ==========\n');
  }
};

const mockClient = {
  channels: {
    fetch: async () => mockChannel
  }
};

// Set required env vars for test
if (!process.env.ENTRY_CHANNEL_ID) process.env.ENTRY_CHANNEL_ID = '111111111111111111';
if (!process.env.VISITOR_ROLE_ID) process.env.VISITOR_ROLE_ID = '987654321098765432';
if (!process.env.MEMBER_ROLE_ID) process.env.MEMBER_ROLE_ID = '876543210987654321';

// Import and run the actual event handler
import eventHandler from './src/events/guildMemberAdd.js';

console.log('\n🧪 Simulating new member join...\n');

eventHandler.execute(mockMember, mockClient).then(() => {
  console.log('✅ Test complete. Above is exactly what a new member sees.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});

