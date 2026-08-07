import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;

const SUPERNATURAL_PDF = 'C:/Users/Shadow/Downloads/Supernatural_Combat_System_Homework_Gleecin.pdf';
const MOMMY_PDF = 'C:/Users/Shadow/Downloads/Mommy_and_Baby_HUD_Homework_Gleecin.pdf';
const REFRESHER_PDF = 'C:/Users/Shadow/Downloads/Second_Life_Scripting_Academy_August_Refresher_v1.pdf';

const CHANNEL_TICKET_Supe = '1533954307408269312';
const CHANNEL_TICKET_MOMMY = '1533955054699020308';
const CHANNEL_RESOURCES = '1498466258377638031';
const CHANNEL_CLASS_UPDATES = '1498465833377333330';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    // ---------- 1) Supernatural Combat homework ----------
    const supeAttach = new AttachmentBuilder(SUPERNATURAL_PDF);
    const supe = new EmbedBuilder()
      .setTitle('🦇 Supernatural Combat System · Homework Time! 🌙✨')
      .setColor('#a78bfa')
      .setDescription(
        'Heyy plugstyles! 💜 Just a heads-up: **class is cancelled today**, but that doesn\u2019t mean you\u2019re off the hook \u2014 your **Phase 1 homework** is ready to go! 📚✨\n\n' +
        'This assignment is *planning on paper* \u2014 zero scripting required. Design your whole supernatural system before you write a single line of LSL. Sounds slow, but it\u2019s the #1 shortcut to actually *finishing* your project. 💭\n\n' +
        'Every section below is one part of the doc \u2014 take it step by step! 🐾'
      )
      .addFields(
        { name: '🗺️ System Architecture', value: 'Map out everything first: the goal of your HUD, the gameplay loop, what makes it unique, how players interact, and your progression.' },
        { name: '🗂️ Asset Planning', value: 'List every animation, sound, texture, mesh, particle, VFX, combat/blood effect, and HUD graphic you\u2019ll need \u2014 sorted into categories so nothing gets forgotten.' },
        { name: '📊 Player Stats', value: 'Pick your species\u2019 stats (health, blood, energy, XP, strength, hunger, humanity\u2026). Decide which decay, which grow, and which are permanent progression.' },
        { name: '🧛 Your First Species · Vampires', value: 'Fully design the transformation, the bite interaction, your blood system + Blood Bank, coffin resting & energy, and vampire weaknesses ~ garlic, sunlight, wooden stakes, silver!' },
        { name: '⚔️ Combat System', value: 'Decide if combat lives in the HUD or a separate HUD, whether species can fight each other, and how battles start/end \u2014 sessions, XP rewards, leaderboards \u2014 the whole flow.' },
        { name: '🖥️ Building the HUD', value: 'Sketch the layout, plan buttons vs menus, then build with artwork + invisible prims + touch detection so you can redesign art without breaking scripts.' },
        { name: '✅ Your Deliverables', value: 'By the end you should have: full system architecture, feature list, vampire progression, combat mechanics, stat design, HUD layout, asset list, database plan, and a clear dev roadmap.' }
      )
      .setFooter({ text: '✏️ Take your time ~ planning on paper is free, rewriting scripts is not! 💜' })
      .setTimestamp();

    await (await client.channels.fetch(CHANNEL_TICKET_Supe)).send({
      content: '🐾 Heads up: **class is cancelled today!**\nYour homework assignment is attached below! 💾',
      embeds: [supe],
      files: [supeAttach]
    });
    console.log('✅ Ticket #0004 (plugstyles) sent');

    // ---------- 2) Mommy & Baby HUD homework ----------
    const mommyAttach = new AttachmentBuilder(MOMMY_PDF);
    const mommy = new EmbedBuilder()
      .setTitle('🍼 Mommy & Baby HUD · Homework Time! 🎀✨')
      .setColor('#ff80ab')
      .setDescription(
        'Hi sweetie! 🌸 **Class is cancelled today**, but your **Phase 4 homework** is here \u2014 and it couldn\u2019t be more for you, because it covers EXACTLY what you asked me earlier! 😉\n\n' +
        'This homework is all about **production prep**: polishing, optimizing, and bullet-proofing your HUD so it works for every player \u2014 not just you. Let\u2019s get your baby\'s stats behaving! 💗'
      )
      .addFields(
        { name: '🗄️ Database & Player Data', value: 'Verify every piece of player data saves/loads correctly (player profile, baby profile, avatar UUID, every stat, settings). Test on 3 different accounts to be sure.' },
        { name: '⏸️ Offline Stat Decay', value: '**This is the big one for you!** 👀 Your stats kept going down while you were logged off \u2014 here you\u2019ll design proper *pause logic* so the baby\u2019s stats DON\u2019T decay offline, and timers resume correctly when you come back.' },
        { name: '🎨 Designing Your Stat System', value: 'Make every interaction meaningful (bottle, pacifier, bath, diaper, hug, nap\u2026) with animations, sounds, cute RP text, hover text, and little cooldowns.' },
        { name: '💬 No Repetitive RP', value: 'Stop sending the same line every press! Rotate randomized, personalized lines \u2014 e.g. "Emma giggles happily", "Emma reaches for Mommy" \u2014 the doc shows exactly how in LSL.' },
        { name: '🧩 Assets & Buttons', value: 'Plan every single button before wiring it (animation, sound, RP text, stat change). No dead buttons, no missing assets, menus stay under LSL\u2019s 12-button limit.' },
        { name: '🔍 Final Testing & Audit', value: 'End-to-end correctness: database matches HUD, full production checklist, a complete audit, then 1\u20132 full days of "try to break it" testing (relog, crash, teleport, reattach).' }
      )
      .setFooter({ text: 'You\u2019ve built the hard part \u2014 now let\u2019s make it polished & trusted 💖' })
      .setTimestamp();

    await (await client.channels.fetch(CHANNEL_TICKET_MOMMY)).send({
      content: '🌸 Heads up: **class is cancelled today!**\nYour homework PDF is attached \u2014 save it for your records! 💾',
      embeds: [mommy],
      files: [mommyAttach]
    });
    console.log('✅ Ticket #2 (dollface) sent');

    // ---------- 3) August Refresher ----------
    const refresherAttach = new AttachmentBuilder(REFRESHER_PDF);
    const refresher = new EmbedBuilder()
      .setTitle('🍂 August Scripting Class Refresher · Welcome Back! 📚✨')
      .setColor('#4cc9f0')
      .setDescription(
        'Welcome back to class, Script Scholars! 🧠💻\n\nIt\u2019s **August Refresher time!!** This is v1 of our big-picture recap \u2014 your go-to reference guide for starting a new project, debugging, and deploying. Keep it handy! 💾'
      )
      .addFields(
        { name: '🎫 Second Life Experiences', value: 'The permission framework for smooth animations, attaches, sits, and teleports slots \u2014 players only accept once. Remember: the landowner must enable your Experience on their land!' },
        { name: '📁 Starting a New Project', value: 'Every project gets a folder with subfolders \u2014 Scripts, Documentation, Textures, Sounds, Animations, SQL, Web, README. Organized projects have fewer bugs.' },
        { name: '🐙 GitHub Repo', value: 'Every project gets a private GitHub repo \u2014 create repo, init Git, connect it, first commit. Version-tracking a non-profit-saving habit!' },
        { name: '📋 Planning Before Coding', value: 'Open Notepad first and write down EVERY feature, interaction, and data plan. Then generate a development roadmap and save it in your folder for reference.' },
        { name: '🗄️ Render, .env & Deployment', value: 'Double-check runtime + Build/Start commands, verify your .env keys (DATABASE_URL, SUPABASE keys, JWT_SECRET), and always read the deployment logs \u2014 Successful doesn\u2019t always mean working.' },
        { name: '🧯 Debugging & Getting Better', value: 'Errors are how you learn LSL. Get specific with exact error messages, line numbers, and code snippets \u2014 "deeply analyze", "ensure all code matches the backend", "run migrations" produce much better help!' }
      )
      .setFooter({ text: '💾 Save this document to your Desktop for reference & study! (v1 \u2014 a newer update may drop later.)' })
      .setTimestamp();

    await (await client.channels.fetch(CHANNEL_RESOURCES)).send({
      content: '🍂 **Your August Refresher just dropped!** \nSave the PDF to your desktop for reference & study time! 💾📖',
      embeds: [refresher],
      files: [refresherAttach],
      allowMentions: { everyone: false }
    });
    console.log('✅ Resources channel sent');

    // ---------- 4) Class updates: cancelled today, resume tomorrow ----------
    const update = new EmbedBuilder()
      .setTitle('📢 Class Cancelled Today \u2014 See You Tomorrow! 💗')
      .setColor('#ffd166')
      .setDescription(
        'Hey Script Scholars! 💫\n\nJust a heads up: **today\'s class session is cancelled** \u2014 life happens! 🥺 We\u2019ll pick right back up **tomorrow, August 7th, 3:30\u20135:30 PM EST**! 🗓️\n\n' +
        'In the meantime, I dropped a brand **new 📚 August Refresher** into the <#1498466258377638031> channel! Pop over and grab the recap + PDF to keep on your desktop for studying. 💾'
      )
      .addFields(
        { name: '🌐 Resources & Curriculum', value: 'Grab the **August Refresher embed + PDF** now in the **Resources & Curriculum** channel \u2014 it\'s your reference guide for every new project! 📖', inline: false },
        { name: '📅 Next Class', value: '**Tomorrow · August 7th · 3:30 \u2013 5:30 PM EST** ⏰ Be there!', inline: false }
      )
      .setFooter({ text: 'See you tomorrow, Script Scholars! 💜' })
      .setTimestamp();

    await (await client.channels.fetch(CHANNEL_CLASS_UPDATES)).send({ embeds: [update] });
    console.log('✅ Class-updates channel sent');

    console.log('✅ All messages sent!');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.on('error', (e) => console.error('client error', e.message));
client.login(TOKEN);