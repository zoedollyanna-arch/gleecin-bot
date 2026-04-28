# 🎓 GLEECIN Academy Portal - Website

A comprehensive student learning platform with Discord OAuth authentication, role-based access, interactive learning, and script library management.

## 🎯 Overview

The GLEECIN Academy Portal is a gated website that connects with Discord for:
- Secure login via Discord OAuth (no typed usernames)
- Role-based access tiers (Free, Paid, Advanced)
- Interactive learning experiences
- Script library with categorization
- Video lesson vault
- Coding challenges and mini-projects
- Certification tracking
- Community support

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Discord Server with configured roles

### Installation

```bash
# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Update .env with your Discord OAuth credentials
# See Configuration section below
```

### Configuration

1. **Discord OAuth Setup**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to OAuth2 → General and copy Client ID and Client Secret
   - Add redirect URI: `http://localhost:3000/auth/callback` (change domain in production)

2. **Environment Variables** (.env)
   ```
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   GUILD_ID=your_guild_id
   STUDENT_ROLE_ID=your_student_role_id
   PAID_STUDENT_ROLE_ID=your_paid_role_id
   ADVANCED_STUDENT_ROLE_ID=your_advanced_role_id
   SESSION_SECRET=secure_random_string_here
   PORT=3000
   ```

### Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Visit: `http://localhost:3000`

## 📁 Project Structure

```
website/
├── src/
│   ├── server.js                 # Main Express server
│   ├── routes/
│   │   ├── auth.js              # Discord OAuth routes
│   │   ├── web.js               # Main website pages
│   │   └── api.js               # Data API endpoints
│   ├── middleware/
│   │   └── auth.js              # Authentication & role checks
│   ├── db/
│   │   └── database.js          # SQLite database
│   ├── utils/
│   │   └── (utilities)          # Helper functions
│   └── views/
│       ├── index.ejs            # Homepage
│       ├── login.ejs            # Login page
│       ├── dashboard.ejs        # Main dashboard
│       ├── classes.ejs          # Class listing
│       ├── scripts.ejs          # Script library
│       ├── lessons.ejs          # Video vault
│       └── (other templates)    # Additional pages
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── images/
├── package.json
└── .env.example
```

## 🔐 Authentication Flow

1. User clicks "Login with Discord"
2. Redirected to Discord OAuth authorization
3. User grants permissions
4. Bot verifies:
   - User is in the guild
   - User has required roles
5. Session created with user data
6. Redirected to dashboard

## 🎯 Features

### Core System
- ✅ Discord OAuth login (no passwords)
- ✅ Role-based access control
- ✅ User sessions (24-hour)
- ✅ Database for tracking progress

### Learning Module
- 📚 Live class information
- 🎥 Video lesson vault with levels
- 💪 Interactive coding challenges
- 📖 Course curriculum
- 📅 Class schedule & announcements

### Script Library
- 🛠️ Organized by category (HUD, Vendors, Animations, Security)
- 📝 Explanations and use cases
- ⚠️ Common mistakes & fixes
- 🎯 Tiered access (Free/Paid/Advanced)
- ⭐ Ratings and download counts

### Tools & Resources
- 🔧 Setup tutorials
- 📋 Beginner starter kit
- 🏆 Step-by-step guides
- 💬 FAQ section

### Monetization
- 💰 Tiered course access
- 🎓 Advanced classes for premium users
- 👨‍🏫 1-on-1 mentoring info
- 🛍️ Exclusive scripts for resale

### Certification
- 🏆 Completion certificates (PDF download)
- 🎖️ In-world badges
- 📊 Progress tracking
- 🎓 Skill verification

## 📊 Database Schema

### Users
- Discord ID, username, email, avatar
- Roles, tier, join date, last login

### Classes
- Name, description, level, duration
- Instructor, price tier, schedule
- Student count, enrollment tracking

### Scripts
- Name, category, tier (free/paid/advanced)
- Code, explanation, use cases, mistakes
- Ratings, downloads, version

### Lessons
- Title, level, duration, video URL
- Progress tracking per user

### Challenges
- Title, difficulty, description
- Starter code, solution, test cases
- User submissions & results

### Certifications
- User achievements, earned dates
- Certificate URLs, badge links

## 🔌 API Endpoints

### Authentication
- `GET /auth/login` - Start OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /auth/logout` - Logout
- `GET /auth/status` - Check auth status
- `GET /auth/user` - Get current user

### Web Routes
- `GET /` - Homepage
- `GET /dashboard` - Main dashboard
- `GET /classes` - Class listing
- `GET /lessons` - Video vault
- `GET /scripts` - Script library
- `GET /schedule` - Schedule view
- `GET /certification` - Certifications
- `GET /profile` - User profile

### API Endpoints
- `GET /api/classes` - List classes
- `GET /api/class/:id` - Class details
- `GET /api/scripts` - List scripts
- `GET /api/lessons` - Video lessons
- `GET /api/challenges` - Coding challenges
- `GET /api/schedule` - Schedule data
- `GET /api/certifications` - User certs

## 🔒 Security

- HTTPS only (in production)
- Secure session cookies (httpOnly, secure flags)
- CSRF protection ready
- Discord token stored server-side only
- Role verification on every protected route
- Database input validation

## 🎨 Theming

The site uses a modern dark theme with:
- Primary color: `#00ff88` (bright green)
- Secondary: `#0099ff` (blue)
- Accent: `#ff9900` (orange)
- Background: `#1a1a1a` (dark gray)

Fully customizable via CSS variables.

## 🚀 Deployment

### Render (recommended)
1. Connect GitHub repository
2. Set environment variables
3. Deploy

### Heroku
```bash
heroku create gleecin-academy
git push heroku main
heroku config:set DISCORD_CLIENT_ID=...
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

## 📈 Future Enhancements

- [ ] Live code editor sandbox
- [ ] "Copy & test" snippet functionality
- [ ] Integration with Discord webhooks
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] Certificate blockchain verification
- [ ] Advanced payment system

## 🛠️ Development

### Adding a New Page

1. Create route in `src/routes/web.js`
2. Create template in `src/views/`
3. Use existing templates as reference
4. Link from navigation

### Adding API Endpoint

1. Add to `src/routes/api.js`
2. Use auth middleware if needed
3. Return JSON response
4. Update documentation

## 📞 Support

For issues and questions:
- Discord: GLEECIN Academy server
- Email: support@gleecin.com
- GitHub: [issues](https://github.com/gleecin/academy)

## 📄 License

MIT - See LICENSE file

---

**Made with 💚 by GLEECIN Academy**
