# GLEECIN Bot - Enhanced Features Documentation

## Overview
Complete Discord bot for the GLEECIN community with integrated scripting academy management.

## ✨ New Features (May 2026 Update)

### 🎫 Enhanced Ticket System
- **Categories**: Support, Commission, Bug Report, Service Inquiry, Technical Issue
- **Lifecycle Management**: Open, Close, Reopen tickets
- **Private Channels**: Each ticket gets its own private channel
- **Staff Integration**: Configurable staff role access
- **Status Tracking**: Channel naming reflects ticket status (ticket → closed-ticket)

**Commands:**
```
/ticket open <category> <description>  - Create a new support ticket
/ticket close [reason]                 - Close the current ticket
/ticket reopen                         - Reopen a closed ticket
```

### 📚 Scripting Academy System
Complete class management for the Jwett Scripting Academy course starting May 1st, 2026.

**Features:**
- Student enrollment tracking
- Course schedule and important dates
- 7-week curriculum breakdown
- Resource library access
- Class announcements

**Commands:**
```
/class enroll                          - Enroll in the Scripting Academy
/class schedule                        - View class times and important dates
/class curriculum                      - View course content breakdown
/class resources                       - Access learning materials and documentation
/class announce <message>              - Post class announcement (instructor only)
```

**Schedule:**
- **Class Sessions**: Tuesdays & Thursdays, 6-8 PM EST
- **Lab Hours**: Sundays, 2-4 PM EST
- **Duration**: 7 weeks
- **Start Date**: May 1st, 2026
- **Final Project Due**: June 15th, 2026

**Curriculum:**
1. **Week 1**: Fundamentals (variables, loops, functions, debugging)
2. **Week 2**: Intermediate Concepts (objects, arrays, error handling, async/await)
3. **Week 3**: DOM & Interaction (DOM manipulation, events, validation)
4. **Week 4**: APIs & Data (REST APIs, JSON, external libraries)
5. **Week 5**: Project Development (structure, modules, testing, optimization)
6. **Week 6**: Advanced Topics (performance, security, deployment, Git)
7. **Week 7**: Capstone Project (planning, implementation, presentation)

### 🐛 Debug Support System
Dedicated debugging help for students with automatic error detection and channel management.

**Features:**
- Automatic debug channel creation
- Priority level assignment (Critical, High, Medium, Low)
- Error tracking and debugging checklist
- Private channels for each debug issue
- Automatic error detection in messages

**Commands:**
```
/debug <issue> [error_message] [code_snippet] [priority]
```

**Automatic Triggers:**
- Detects "Error:", "Failed:", TypeError, ReferenceError keywords
- Suggests `/debug` command in any channel where errors are mentioned

### ⭐ Student Showcase System
Portfolio management for student projects and work.

**Features:**
- Project submissions with metadata
- GitHub repository links
- Live demo links
- Technology tags
- Community feedback reactions
- Instructor approval system
- Featured project highlighting

**Commands:**
```
/showcase submit <name> <description> [github] [demo] [skills]
/showcase list          - View all submitted projects
/showcase approve <id>  - Approve a submission (instructor only)
```

### 🌐 Channel Information System
Automated channel information messages with typing indicators.

**Features:**
- Pre-configured channel info for all major channels
- Bot typing indicator before sending messages
- Beautiful embed formatting
- Channel-specific guidelines and quick links

**Commands:**
```
/channelinfo setup <channel> <type>
```

**Available Types:**
- General Chat Info
- Gallery Rules
- Reviews Guide
- Support Instructions
- Services Overview
- Pricing Info

### 📋 Enhanced Community Features

**Welcome System:**
- Automatic new member greeting
- Visitor → Member role progression
- Access button system

**Channel Management:**
- Gallery enforcement (images only)
- Auto-reactions (⭐🔥)
- Pricing keyword detection
- Review verification system

**Auto-Moderation:**
- Banned word filtering
- Channel-specific content enforcement
- Message cleanup with guidance

## 🛠️ Environment Configuration

Required environment variables in `.env`:

```env
# Bot Credentials
DISCORD_TOKEN=your_token
CLIENT_ID=your_client_id
GUILD_ID=your_server_id

# Welcome System
ENTRY_CHANNEL_ID=channel_id
VISITOR_ROLE_ID=role_id
MEMBER_ROLE_ID=role_id

# Main Channels
GENERAL_CHANNEL_ID=channel_id
GALLERY_CHANNEL_ID=channel_id
REVIEWS_CHANNEL_ID=channel_id
SUPPORT_CHANNEL_ID=channel_id
CLIENT_ROLE_ID=role_id

# Staff Roles
STAFF_ROLE_ID=role_id
INSTRUCTOR_ROLE_ID=role_id

# Scripting Academy
STUDENT_ROLE_ID=role_id
CLASS_UPDATES_CHANNEL_ID=channel_id
DEBUG_SUPPORT_CHANNEL_ID=channel_id
SHOWCASE_CHANNEL_ID=channel_id

# Moderation
BANNED_WORDS=word1,word2
```

## 📁 Project Structure

```
src/
├── commands/
│   ├── channels.js          - Channel management
│   ├── channelinfo.js       - Channel info messages (NEW)
│   ├── class.js             - Scripting academy commands (NEW)
│   ├── debug.js             - Debug support system (NEW)
│   ├── help.js              - Help menu
│   ├── ping.js              - Status check
│   ├── showcase.js          - Student showcase (NEW)
│   ├── ticket.js            - Enhanced ticket system
│   └── welcome.js           - Welcome system
├── events/
│   ├── guildMemberAdd.js    - New member welcome
│   ├── interactionCreate.js - Button interactions
│   └── messageCreate.js     - Message handling (enhanced)
└── index.js                 - Bot initialization
```

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord IDs and tokens
   ```

3. **Deploy Commands**
   ```bash
   npm run deploy:commands
   ```

4. **Start Bot**
   ```bash
   npm start
   ```

## 📖 Usage Examples

### Opening a Support Ticket
```
/ticket open commission I need a website built for my game server
```

### Enrolling in Scripting Academy
```
/class enroll
```

### Reporting a Bug
```
/debug Issue: Function not returning value
error_message: TypeError: Cannot read property 'undefined'
code_snippet: const result = getData();
priority: high
```

### Submitting a Project
```
/showcase submit todo-app A React todo application with local storage
github: https://github.com/user/todo-app
demo: https://user-todo-app.netlify.app
skills: React, JavaScript, CSS, Local Storage
```

### Setting Up Channel Info
```
/channelinfo setup #general general
/channelinfo setup #gallery gallery
```

## 🔒 Permissions

- **Admin Commands**: Channel setup, announcements, approvals
- **Student Commands**: Enrollment, resource access, submissions
- **Public Commands**: Help, ticket creation, class schedule
- **Instructor Only**: Class announcements, showcase approvals

## 💡 Features Highlights

✅ **Automated Ticket Management** - No manual channel creation needed
✅ **Comprehensive Class System** - Complete course management
✅ **Smart Error Detection** - Automatic debug channel creation
✅ **Student Portfolio** - Showcase work and build reputation
✅ **Community Moderation** - Automated content enforcement
✅ **Typing Indicators** - Professional looking messages
✅ **Role-Based Access** - Flexible permission system
✅ **Extensible Design** - Easy to add new features

## 🔄 Event Handlers

- **guildMemberAdd**: Welcome new members
- **interactionCreate**: Handle button clicks
- **messageCreate**: Channel-specific auto-responses and error detection

## 📝 Notes

- All ticket channels are automatically created as private
- Debug channels include helpful debugging checklists
- Showcase submissions can be approved by instructors for featured status
- Error detection works across all channels
- Channel info messages include typing indicators for professional appearance

---

**Bot Status**: ✅ Online and Ready
**Version**: 2.0.0 (Enhanced with Scripting Academy)
**Last Updated**: April 27, 2026
