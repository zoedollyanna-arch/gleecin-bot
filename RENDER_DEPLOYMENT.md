# 🚀 GLEECIN Bot - Render Deployment Guide

**Status:** ✅ Ready for Production  
**Architecture:** Unified Website + Discord Bot  
**Date:** April 28, 2026

---

## 📋 Quick Summary

Your application now has a **unified server** that runs:
- ✅ **Website** (Academy Portal) on the main Render URL
- ✅ **Discord Bot** (background service)
- ✅ **Database** (PostgreSQL on Neon)

When you visit your Render URL, you'll see the **website**, not "bot is online". The bot runs in the background handling Discord commands and events.

---

## 🎯 Step 1: Create Admin User in Database

**SQL Command to create admin:**

```sql
INSERT INTO users (discord_id, username, is_admin, tier, email, joined_at)
VALUES (
  '1197552066269282306',
  'zoedollyanna',
  true,
  'advanced',
  'admin@gleecin.com',
  NOW()
)
ON CONFLICT (discord_id) DO UPDATE SET
  is_admin = true,
  tier = 'advanced';
```

**To run this SQL:**

1. **Option A: Using Neon Dashboard**
   - Go to neon.tech
   - Navigate to your project
   - Go to SQL Editor
   - Paste the SQL above
   - Click "Execute"

2. **Option B: Using PostgreSQL CLI**
   ```bash
   psql $DATABASE_URL < website/create-admin-user.sql
   ```

**Verify it worked:**
```sql
SELECT id, discord_id, username, is_admin FROM users WHERE discord_id = '1197552066269282306';
```

---

## 🌐 Step 2: Deploy to Render

### Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize the connection

### Connect Your Repository

1. Click **"New +"** → **"Web Service"**
2. Select **"Build and deploy from a Git repository"**
3. Search for **`zoedollyanna-arch/gleecin-bot`**
4. Click **"Connect"**

### Configure the Service

**General Settings:**
- **Name:** `gleecin-bot` (or similar)
- **Environment:** `Node`
- **Region:** `Oregon` (or closest to you)
- **Branch:** `main`

**Build Settings:**
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Plan:** `Free` (or upgrade if needed)

### Add Environment Variables

Click **"Environment"** and add these variables:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://neondb_owner:your_password@ep-plain-grass-anvcy60e.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require

# Discord Bot (REQUIRED)
DISCORD_TOKEN=your_discord_bot_token_here
GUILD_ID=1345747819415212062

# Discord OAuth (REQUIRED)
DISCORD_CLIENT_ID=1476576710144032869
DISCORD_CLIENT_SECRET=your_oauth_secret_here
REDIRECT_URI=https://your-render-url.onrender.com/auth/callback

# Security (REQUIRED - use random string)
SESSION_SECRET=change_this_to_a_random_secure_string

# Optional
NODE_ENV=production
PORT=3000
```

**How to get each variable:**

1. **DATABASE_URL** - From Neon dashboard → Connection string → PostgreSQL
2. **DISCORD_TOKEN** - From Discord Developer Portal → Bot → Copy Token
3. **GUILD_ID** - Your Discord server ID (right-click server)
4. **DISCORD_CLIENT_ID** - From Discord Developer Portal → General Information
5. **DISCORD_CLIENT_SECRET** - From Discord Developer Portal → OAuth2
6. **REDIRECT_URI** - Get from Render after first deploy (e.g., `https://gleecin-bot.onrender.com/auth/callback`)
7. **SESSION_SECRET** - Generate random: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Deploy

1. Scroll to bottom and click **"Create Web Service"**
2. Render will build and deploy automatically
3. Watch the build logs (should take 2-3 minutes)
4. Once deployed, you'll get a URL like: `https://gleecin-bot.onrender.com`

### Update OAuth Redirect URI

After first deploy:

1. Copy your Render URL (e.g., `https://gleecin-bot.onrender.com`)
2. Update **REDIRECT_URI** in Render Environment variables:
   ```
   https://gleecin-bot.onrender.com/auth/callback
   ```
3. Render will auto-redeploy

---

## ✅ Step 3: Verify Deployment

Once deployed, test these URLs:

**Website:**
```
https://your-render-url.onrender.com
https://your-render-url.onrender.com/admin
https://your-render-url.onrender.com/health
```

**Expected Results:**
- **`/`** - GLEECIN Academy homepage
- **`/admin`** - Admin dashboard (shows "GLEECIN bot is online" with website behind it)
- **`/health`** - JSON response with status

**Discord Bot:**
- Check your Discord server - bot should show as online
- Try running bot commands (e.g., `/ping`)

---

## 🔧 Troubleshooting Render Deployment

### "Module not found" Error

**Solution:** Render is using the wrong entry point
- Check that `package.json` has: `"main": "website/src/unified-server.js"`
- Check `"start"` script has: `"node website/src/unified-server.js"`

### Website shows 404

**Solution:** Make sure routes are properly configured
- Check that `/` route exists
- Check views are in `website/src/views/`
- Clear browser cache

### Bot is offline

**Solution:** Discord connection issue
- Verify `DISCORD_TOKEN` is correct
- Verify `GUILD_ID` is correct
- Check bot is in your Discord server
- Check Render logs for connection errors

### Database connection error

**Solution:** Environment variable issue
- Verify `DATABASE_URL` is complete and correct
- Test connection locally: `psql $DATABASE_URL`
- Check database exists and tables are created

### Website loads but admin panel is 404

**Solution:** Routes not set up properly
- Make sure `/admin` route exists in `website/src/routes/admin.js`
- Verify EJS templates exist in `website/src/views/admin/`
- Check that `adminRoutes` is imported in `unified-server.js`

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────┐
│        Your Render URL                  │
│   https://gleecin-bot.onrender.com      │
└─────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │  Unified Node Server │
         └──────────────────────┘
         /                    \
        /                      \
    ┌─────────┐          ┌──────────────┐
    │ Website │          │ Discord Bot  │
    │ Express │          │   Client     │
    │  App    │          │              │
    └─────────┘          └──────────────┘
        ↓                      ↓
    ┌─────────┐          ┌──────────────┐
    │ Routes  │          │ Commands &   │
    │ Views   │          │ Events       │
    │ API     │          │              │
    └─────────┘          └──────────────┘
         |                      |
         └──────────┬───────────┘
                    ↓
         ┌──────────────────────┐
         │ PostgreSQL Database  │
         │    (Neon.tech)       │
         └──────────────────────┘
```

---

## 🔐 Security Checklist

Before going live:

- [ ] `SESSION_SECRET` is a random string (not default)
- [ ] `DISCORD_CLIENT_SECRET` is kept secret
- [ ] Database credentials are in environment variables (not in code)
- [ ] Admin user created in database
- [ ] HTTPS enabled (Render does this automatically)
- [ ] Rate limiting active (`express-rate-limit`)
- [ ] Input validation on all forms
- [ ] Error messages don't expose sensitive info

---

## 📈 Monitoring

**Monitor your deployment:**

1. **Render Dashboard:**
   - Go to your service
   - Check logs in real-time
   - View resource usage
   - Set up alerts

2. **Check Health Endpoint:**
   ```bash
   curl https://your-render-url.onrender.com/health
   ```

3. **Monitor Discord Bot:**
   - Check bot presence in Discord
   - Test bot commands
   - Check Discord application logs

---

## 🚀 After Deployment

### Test Admin Features

1. Go to `https://your-render-url.onrender.com/admin`
2. You should be redirected to Discord login
3. After login, you should see admin dashboard
4. Test each feature:
   - View users
   - View pending payments
   - View scripts
   - View lessons
   - View certificates
   - View admin logs

### Test Bot Commands

In Discord:
```
/ping - Check bot response
/help - View all commands
/ticket open - Open support ticket
/class enroll - Enroll in academy
```

### Test Payment Flow

1. Go to academy page
2. Try to enroll in paid tier
3. Should be able to submit payment
4. Payment appears in admin panel
5. Admin can verify payment

---

## 📞 Support & Next Steps

### If Something Goes Wrong

1. **Check Render Logs:**
   ```
   Render Dashboard → Your Service → Logs
   ```

2. **Check Database:**
   ```sql
   SELECT version();
   SELECT COUNT(*) FROM users;
   ```

3. **Test Locally First:**
   ```bash
   npm run dev
   # Should start both website and bot
   ```

### Next Steps

- [ ] Set up monitoring/alerts
- [ ] Create admin documentation
- [ ] Test with real Discord users
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Plan scaling strategy

---

## 📚 Reference Files

- **Unified Server:** `website/src/unified-server.js`
- **Render Config:** `render.yaml`
- **Admin User SQL:** `website/create-admin-user.sql`
- **Environment Template:** `.env`
- **Package Config:** `package.json`

---

## ✨ Summary

You now have:
- ✅ Website serving on your Render URL
- ✅ Discord bot running alongside website
- ✅ Admin panel with full management tools
- ✅ Database connected and ready
- ✅ Admin user created
- ✅ Everything pushed to GitHub
- ✅ Production-ready architecture

**Your GLEECIN Academy is ready to launch! 🚀**

---

**Last Updated:** April 28, 2026  
**Version:** 1.0.0  
**Status:** Production Ready
