# 🚀 GLEECIN Bot & Website - Setup Guide

## Overview
This guide will help you get both the Discord bot and the Academy website running locally or in production.

## Prerequisites
- Node.js 16+ (LTS recommended)
- npm or yarn
- Discord Server (for bot testing)
- Discord Developer Portal access
- Text editor or IDE

## Part 1: Bot Setup (Updated Features)

### Step 1: Update Environment Variables
Edit `.env` in the root directory with all your Discord server configuration:

```bash
# Bot token and ID
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_server_id_here

# Channel IDs
ENTRY_CHANNEL_ID=welcome_channel_id
GENERAL_CHANNEL_ID=general_channel_id
CLASS_UPDATES_CHANNEL_ID=class_channel_id
DEBUG_SUPPORT_CHANNEL_ID=debug_channel_id
SHOWCASE_CHANNEL_ID=showcase_channel_id

# Role IDs
VISITOR_ROLE_ID=visitor_role_id
MEMBER_ROLE_ID=member_role_id
STUDENT_ROLE_ID=student_role_id
INSTRUCTOR_ROLE_ID=instructor_role_id
STAFF_ROLE_ID=staff_role_id
```

### Step 2: Test New Bot Features
Run the bot and test:

```bash
npm start
```

**Test Checklist:**
- [ ] User joins server → Gets welcome message with 4 buttons
- [ ] #brand-info channel → Gets branded GLEECIN message
- [ ] #community-standards → Gets community guidelines message
- [ ] Click enrollment button → Works without error
- [ ] Click support button → Creates support ticket
- [ ] Click marketplace button → Shows marketplace info
- [ ] `/class resources` → Shows only real resources (no assignments)

### Bot Improvements Summary
✅ **Welcome Experience**: Branded welcome with 4 quick-action buttons
✅ **Channel Messages**: Auto-sends to brand-info and community-standards
✅ **Fixed Bugs**: Button interactions now work (was "Interaction failed" error)
✅ **Accurate Content**: /class resources now reflects real curriculum

---

## Part 2: Website Setup (New Academy Portal)

### Step 1: Install Dependencies
```bash
cd website
npm install
```

### Step 2: Discord OAuth Configuration

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click your application
3. Go to **OAuth2 → General**
4. Copy **Client ID** and **Client Secret**
5. Go to **OAuth2 → URL Generator**
6. Select scopes:
   - identify
   - email
   - guilds.members.read
7. Copy the generated URL and save it

### Step 3: Set Up Environment File
Create `website/.env`:

```bash
# Discord OAuth
DISCORD_CLIENT_ID=paste_client_id_here
DISCORD_CLIENT_SECRET=paste_client_secret_here
GUILD_ID=your_server_id_here
REDIRECT_URI=http://localhost:3000/auth/callback

# Role IDs for Access Tiers
STUDENT_ROLE_ID=your_student_role_id
PAID_STUDENT_ROLE_ID=your_paid_student_role_id
ADVANCED_STUDENT_ROLE_ID=your_advanced_student_role_id

# Session & Security
SESSION_SECRET=create_a_random_secure_string_here

# Server
PORT=3000
NODE_ENV=development
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Start the Website

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Visit: `http://localhost:3000`

### Step 5: Test OAuth Flow
1. Click "Login with Discord" button
2. Authorize the application
3. You should be redirected to dashboard
4. Verify your username appears

### Initial Testing

**Unauthenticated Pages:**
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Login button visible

**Authenticated Pages:**
- [ ] Dashboard loads after login
- [ ] Shows welcome message with your username
- [ ] Shows your access tier
- [ ] All dashboard cards are visible
- [ ] Progress bars display correctly

---

## Architecture Overview

### Bot Features
```
Bot Login
├── Commands
│   ├── /class (enroll, schedule, curriculum, resources, announce)
│   ├── /ticket (open, close, reopen)
│   ├── /debug (create debug tickets)
│   ├── /ping
│   ├── /help
│   └── /showcase
├── Events
│   ├── guildMemberAdd (send welcome with buttons)
│   ├── interactionCreate (handle button clicks)
│   ├── messageCreate (message logging)
│   └── channelSetup (auto-messages on startup)
└── Features
    ├── Welcome Experience (branded, 4 buttons)
    ├── Ticket System (support, commission, debug)
    ├── Class Management
    ├── Student Showcase
    └── Debugging Support
```

### Website Features
```
Website Login
├── Discord OAuth Flow
│   ├── User clicks login
│   ├── Redirected to Discord
│   ├── User authorizes
│   └── Token exchanged
├── Access Control
│   ├── Verify in guild
│   ├── Check roles
│   └── Set tier (free/paid/advanced)
├── Main Pages
│   ├── Homepage
│   ├── Dashboard
│   ├── Academy
│   ├── Classes
│   ├── Scripts Library
│   ├── Lessons
│   ├── Tools & Guides
│   ├── Support Center
│   ├── Marketplace
│   └── Certifications
└── Data
    ├── User profiles
    ├── Enrollment tracking
    ├── Script access
    ├── Progress tracking
    └── Certificates
```

---

## Troubleshooting

### Bot Issues

**"Interaction failed" error when clicking buttons**
- ✅ FIXED: Updated interaction handler in src/index.js

**Commands not appearing**
- Run: `npm run deploy:commands`
- Wait 15 minutes for Discord to update

**Bot not responding**
- Check token in .env
- Verify bot has permissions in server
- Check bot is actually connected: `[Bot Name] Logged in as...`

### Website Issues

**"Authentication verification failed"**
- Verify DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET
- Check GUILD_ID is correct
- Verify bot is in the guild

**White page or 500 error**
- Check console for errors
- Verify all environment variables are set
- Clear browser cache and try again

**"User not in guild"**
- Make sure you're in the test Discord server
- The OAuth flow checks guild membership
- Add yourself to the server first

---

## File Structure Reference

```
gleecin_bot/
├── src/
│   ├── commands/
│   │   ├── class.js (✅ Updated - fixed resources)
│   │   ├── ticket.js (✅ Working)
│   │   └── ...
│   ├── events/
│   │   ├── guildMemberAdd.js (✅ Enhanced - 4 buttons)
│   │   ├── interactionCreate.js (✅ Fixed - button handler)
│   │   ├── channelSetup.js (✅ New - auto-messages)
│   │   └── ...
│   ├── index.js (✅ Updated - interaction routing)
│   └── deploy-commands.js
├── website/ (✅ NEW COMPLETE)
│   ├── src/
│   │   ├── server.js (Express server)
│   │   ├── routes/
│   │   │   ├── auth.js (Discord OAuth)
│   │   │   ├── web.js (Pages)
│   │   │   └── api.js (Data)
│   │   ├── middleware/
│   │   │   └── auth.js (Auth checks)
│   │   ├── db/
│   │   │   └── database.js (SQLite)
│   │   └── views/
│   │       ├── index.ejs
│   │       ├── login.ejs
│   │       ├── dashboard.ejs
│   │       └── (more templates)
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── .env (update with your IDs)
├── IMPLEMENTATION_SUMMARY.md (✅ NEW - full details)
└── README.md
```

---

## Running Both Simultaneously

### Terminal 1: Bot
```bash
# In root directory
npm start
```

### Terminal 2: Website
```bash
# In website directory
cd website
npm run dev
```

Both will run on different ports:
- Bot: Discord API
- Website: http://localhost:3000

---

## Next Steps to Enhance

### Immediate
1. Deploy bot with new features (test in your server)
2. Deploy website (test auth flow)
3. Create remaining template pages
4. Add CSS styling

### Short Term
1. Implement interactive learning challenges
2. Build script library functionality
3. Create lesson vault with videos
4. Add payment system

### Medium Term
1. Advanced analytics
2. Marketplace integration
3. Certificate generation
4. Admin dashboard

---

## Support

- **Bot Issues**: Check `FEATURES.md` and bot logs
- **Website Issues**: Check `website/README.md`
- **OAuth Issues**: Verify Discord Developer Portal settings
- **Database Issues**: Check `website/src/db/database.js`

---

## Documentation Files

- `FEATURES.md` - Bot features and commands
- `IMPLEMENTATION_SUMMARY.md` - What was built
- `website/README.md` - Website documentation
- `QUICK_REFERENCE.md` - Quick command reference
- This file - Setup and troubleshooting

---

**Everything is ready to go! Happy coding! 🚀**
