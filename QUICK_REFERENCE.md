# 🎯 Quick Reference Card - GLEECIN Bot Commands

## 🎫 Ticket System

```
/ticket open <category> "<description>"
  Categories: support | commission | bug | inquiry | technical
  Example: /ticket open support "I need help with my account"
  
/ticket close [reason]
  Use in: Any ticket channel
  Example: /ticket close "Issue resolved, thank you!"
  
/ticket reopen
  Use in: Any closed-ticket channel
  Reactivates the ticket for further discussion
```

---

## 🎓 Scripting Academy

```
/class enroll
  ✓ Assigns Student role
  ✓ Unlocks class channels
  ✓ Grants resource access
  
/class schedule
  Shows: Class times, important dates, session info
  • Tuesdays & Thursdays: 6-8 PM EST
  • Sundays (Labs): 2-4 PM EST
  • Start: May 1st, 2026
  
/class curriculum
  Shows: 7-week course breakdown
  Week 1: Fundamentals
  Week 2: Intermediate Concepts
  Week 3: DOM & Interaction
  Week 4: APIs & Data
  Week 5: Project Development
  Week 6: Advanced Topics
  Week 7: Capstone Project
  
/class resources
  Links to:
  • Course documentation
  • Code examples
  • Video tutorials
  • External resources
  
/class announce "<message>"
  (Instructor only)
  Posts announcement to #class-updates with @here ping
```

---

## 🐛 Debug Support

```
/debug "<issue description>"
  Example: /debug "Function returning undefined"
  
/debug "<issue>" error_message:"<error>"
  Example: /debug "Loop not executing" error_message:"ReferenceError: x is not defined"
  
/debug "<issue>" error_message:"<error>" code_snippet:"<code>" priority:"<level>"
  Example: /debug "API not returning data" 
           error_message:"TypeError: Cannot read property 'data'"
           code_snippet:"const data = await fetch(...)"
           priority:high

Priority Levels:
  🔴 critical - Code won't run
  🟠 high - Major functionality broken
  🟡 medium - Feature not working (default)
  🟢 low - Minor issue

Result:
  ✓ Private debug channel created
  ✓ Debugging checklist included
  ✓ Instructors notified
  ✓ Resources provided
```

---

## ⭐ Student Showcase

```
/showcase submit "<project_name>" "<description>"
  Example: /showcase submit "To-Do App" "A React app with local storage"
  
/showcase submit "<name>" "<description>" github:"<url>"
  Example: /showcase submit "Bot API" "Discord bot framework" 
           github:"https://github.com/user/bot"
  
/showcase submit "<name>" "<description>" github:"<url>" demo:"<url>"
  Example: /showcase submit "Game" "2D shooter game" 
           demo:"https://user-game.netlify.app"
  
/showcase submit "<name>" "<desc>" github:"<url>" demo:"<url>" skills:"<techs>"
  Example: /showcase submit "Full-Stack App" "Complete web application"
           github:"..." demo:"..." skills:"React,Node,MongoDB,Express"

Result:
  ✓ Posted to #student-showcase
  ✓ Gets community feedback reactions
  ✓ Can be approved for featured status
  ✓ Builds portfolio

/showcase list
  Shows: Gallery info and how to submit
  
/showcase approve "<submission_id>"
  (Instructor only) - Marks project as featured
```

---

## 🌐 Channel Information

```
/channelinfo setup <channel> <type>
  Types Available:
  - general    → General Chat Info
  - gallery    → Gallery Rules
  - reviews    → Reviews Guide
  - support    → Support Instructions
  - services   → Services Overview
  - pricing    → Pricing Info

Example:
  /channelinfo setup #general general
  /channelinfo setup #gleecin-gallery gallery
  /channelinfo setup #help-and-support support

Result:
  ✓ Bot shows typing indicator
  ✓ Posts beautiful info embed
  ✓ Includes channel guidelines
  ✓ Provides quick links
```

---

## 👥 Administration

```
/channels setup general:<channel> gallery:<channel> reviews:<channel> 
           support:<channel> client:<role>
           
/welcome setup visitor:<role> member:<role>

/help
  Displays all available commands with descriptions
```

---

## 📊 Channel Behaviors

### #general-chat
- Detects pricing questions
- Automatically responds with pricing info
- Filters banned words
- Deletes inappropriate content

### #gleecin-gallery
- Enforces images only
- Auto-reacts with ⭐🔥 to images
- Deletes text messages
- Reminds users of rules

### #client-reviews
- Auto-reacts with 👑
- Badges verified client reviews
- Encourages testimonials

### #help-and-support
- Provides quick guidance
- Suggests ticket creation
- Shows available resources

### #debug-support
- Acknowledges reported issues
- Notifies instructors
- Tracks error patterns

---

## 🔔 Auto-Detection Features

**Bot automatically detects:**
- "Error:" keywords
- "Failed:" keywords
- TypeError messages
- ReferenceError messages

**Auto Response:**
- Suggests `/debug` command
- Offers debugging guide link
- Provides discussion channel info

---

## 🎯 Typical Student Workflow

```
1. Enroll in class
   /class enroll
   
2. Check when class meets
   /class schedule
   
3. Learn the curriculum
   /class curriculum
   
4. Access course materials
   /class resources
   
5. Get help with errors
   /debug "My error message"
   
6. Submit completed projects
   /showcase submit "Project" "Description" github:"url"
   
7. Check for announcements
   See #class-updates for: /class announce messages
```

---

## 🎯 Typical Instructor Workflow

```
1. Start class session
   /class announce "Class starting in 5 min! Join #live-discussion"
   
2. Post important updates
   /class announce "Assignment due Friday"
   
3. Monitor debug channel
   Check #debug-support for issues
   
4. Review submissions
   Check #student-showcase
   
5. Feature outstanding work
   /showcase approve <submission_id>
```

---

## ⚙️ Required Environment Setup

Before using commands, administrator must set these environment variables:

```env
STUDENT_ROLE_ID=your_student_role_id
INSTRUCTOR_ROLE_ID=your_instructor_role_id
CLASS_UPDATES_CHANNEL_ID=your_class_updates_channel
DEBUG_SUPPORT_CHANNEL_ID=your_debug_support_channel
SHOWCASE_CHANNEL_ID=your_showcase_channel
```

See DEPLOYMENT_CHECKLIST.md for complete setup guide.

---

## 📞 Support

**Need help?** Use one of these:

1. **For inquiries**: `/ticket open inquiry "Your question"`
2. **For bugs**: `/debug "Error message"`
3. **For coursework**: `/debug "Code issue"` in class channels
4. **For announcements**: Ask instructor to `/class announce`

---

**All Commands Ready** ✅
**Scripting Academy Launch**: May 1st, 2026 🎓
**Last Updated**: April 27, 2026
