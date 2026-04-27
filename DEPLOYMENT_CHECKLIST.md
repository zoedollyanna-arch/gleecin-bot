# 🚀 Deployment Checklist - GLEECIN Bot Enhanced Edition

## Before You Deploy

### 1. Discord Server Setup

**Create Channels** (Required):
- [ ] `#entry` - Welcome/entry point
- [ ] `#general-chat` - Main discussion
- [ ] `#gleecin-gallery` - Images only
- [ ] `#client-reviews` - Reviews channel
- [ ] `#help-and-support` - Support channel
- [ ] `#open-support-ticket` - Intake channel
- [ ] `#open-commission-ticket` - Intake channel

**Create Channels** (Scripting Academy):
- [ ] `#class-updates` - Class announcements
- [ ] `#live-discussion` - Real-time chat during class
- [ ] `#debug-support` - Debug issue reporting
- [ ] `#resources-and-curriculum` - Course materials
- [ ] `#student-showcase` - Project gallery
- [ ] `#assignments` - Assignment submissions

**Create Roles** (Required):
- [ ] `Visitor` - New members role
- [ ] `Member` - Full access role
- [ ] `Client` - Verified client role
- [ ] `Staff` - Staff/moderator role
- [ ] `Student` - Student role
- [ ] `Instructor` - Instructor role

### 2. Bot Configuration

**Discord Developer Portal**:
- [ ] Create bot application
- [ ] Copy `DISCORD_TOKEN` (bot token)
- [ ] Copy `CLIENT_ID` (application ID)
- [ ] Enable "Message Content Intent"
- [ ] Enable "Server Members Intent"
- [ ] Enable "Guild Members Intent"

**Permissions Required**:
- [ ] Read Messages/View Channels
- [ ] Send Messages
- [ ] Embed Links
- [ ] Read Message History
- [ ] Manage Messages
- [ ] Manage Channels
- [ ] Create Private Threads
- [ ] Manage Roles
- [ ] Add Reactions
- [ ] Mention @everyone, @here, and All Roles

### 3. Environment Variables

Create `.env` file with these values:

```env
DISCORD_TOKEN=your_bot_token_from_discord_dev_portal
CLIENT_ID=your_application_id
GUILD_ID=your_server_id

# Get IDs by right-clicking on channels/roles in Discord
# (Enable Developer Mode first: User Settings → Advanced → Developer Mode)

# Welcome System
ENTRY_CHANNEL_ID=12345...
VISITOR_ROLE_ID=12345...
MEMBER_ROLE_ID=12345...

# Main Channels
GENERAL_CHANNEL_ID=12345...
GALLERY_CHANNEL_ID=12345...
REVIEWS_CHANNEL_ID=12345...
SUPPORT_CHANNEL_ID=12345...
CLIENT_ROLE_ID=12345...

# Staff
STAFF_ROLE_ID=12345...
INSTRUCTOR_ROLE_ID=12345...

# Scripting Academy
STUDENT_ROLE_ID=12345...
CLASS_UPDATES_CHANNEL_ID=12345...
DEBUG_SUPPORT_CHANNEL_ID=12345...
SHOWCASE_CHANNEL_ID=12345...

# Optional
BANNED_WORDS=spam,abuse
```

### 4. Installation Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Discord IDs

# 3. Deploy slash commands (IMPORTANT!)
npm run deploy:commands

# 4. Start the bot
npm start
```

### 5. Post-Deployment Setup

**Channel Setup**:
```
/channels setup general:<#general-chat> gallery:<#gleecin-gallery> reviews:<#client-reviews> support:<#help-and-support> client:<@Client>

/welcome setup visitor:<@Visitor> member:<@Member>
```

**Channel Information**:
```
/channelinfo setup #general general
/channelinfo setup #gleecin-gallery gallery
/channelinfo setup #client-reviews reviews
/channelinfo setup #help-and-support support
/channelinfo setup #channel-services services
/channelinfo setup #channel-pricing pricing
```

**Test Commands**:
```
/ping                    - Should respond with bot status
/help                    - Should show all commands
/class schedule          - Should show class schedule
/class curriculum        - Should show curriculum
/class resources         - Should show resources
```

### 6. Class Kickoff (May 1st)

**Before Class Starts**:
- [ ] Create `@Student` role
- [ ] Create `@Instructor` role
- [ ] Set up all Scripting Academy channels
- [ ] Post resources in #resources-and-curriculum
- [ ] Announce class start date in #class-updates

**Class Communication**:
```
/class announce "Class starts TODAY! Join #live-discussion at 6 PM EST"
```

### 7. Troubleshooting

**Commands not showing up?**
- Run `npm run deploy:commands` again
- Wait 1 hour for Discord to sync
- Restart the bot

**Bot not responding?**
- Check bot token in .env
- Verify bot has permissions in channel
- Check if bot is online (green status)

**Channel info messages not appearing?**
- Verify channel IDs in .env
- Check bot permissions in target channel
- Ensure bot can send messages

**Tickets not creating?**
- Verify bot has "Manage Channels" permission
- Check bot role is below staff role in role hierarchy
- Ensure STAFF_ROLE_ID is configured

### 8. Security Checklist

- [ ] Bot token stored securely (never in public repos)
- [ ] `.env` file added to `.gitignore`
- [ ] Only authorized users can run admin commands
- [ ] Staff role configured with appropriate permissions
- [ ] Instructor role restricted to trusted members
- [ ] BANNED_WORDS configured for your community

### 9. Maintenance

**Regular Tasks**:
- [ ] Monitor debug channel for unresolved issues
- [ ] Archive old closed tickets monthly
- [ ] Review and update curriculum resources
- [ ] Check for Discord API changes
- [ ] Keep bot dependencies updated

**Monthly**:
- [ ] Review student progress
- [ ] Archive completed projects
- [ ] Update class announcements
- [ ] Backup channel configurations

### 10. Features Quick Reference

| Feature | Command | Requires |
|---------|---------|----------|
| Support Ticket | `/ticket open` | Any member |
| Enroll Class | `/class enroll` | Any member |
| View Schedule | `/class schedule` | Any member |
| Report Bug | `/debug` | Student role |
| Submit Project | `/showcase submit` | Student role |
| Post Announcement | `/class announce` | Instructor role |
| Setup Channel | `/channelinfo setup` | Admin |
| Setup System | `/channels setup` | Admin |

---

## 🎯 Success Indicators

✅ Bot shows online status
✅ `/help` displays all commands
✅ New members get welcome message
✅ Tickets create private channels
✅ Debug commands work with typing indicator
✅ Class commands show schedules
✅ Channel info messages appear with typing
✅ Showcase submissions accepted
✅ Student role assignments work

---

**Ready to go live!** 🚀
