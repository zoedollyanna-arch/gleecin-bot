# Session & CORS Fix Plan

## Information Gathered

1. **Session Configuration Issues:**
   - Both `unified-server.js` and `server.js` use `secure: process.env.NODE_ENV === 'production'` for session cookies.
   - On Render (production), the app runs behind a reverse proxy. Without `trust proxy`, Express thinks requests are HTTP (not HTTPS), so `secure: true` cookies are rejected.
   - `sameSite` is not explicitly set, which can cause cookie rejection in cross-origin or iframe scenarios.
   - `proxy: true` is not set in the session store config.

2. **CORS Configuration Issues:**
   - Both servers use `app.use(cors())` with no options. This allows all origins BUT does **not** allow credentials (cookies) by default.
   - For authenticated requests, CORS must be configured with `credentials: true` and a specific (or dynamic) `origin`.

3. **Frontend Fetch Issues:**
   - `certification.js`, `learning.js`, `scripts.js`, and `lessons.js` all use `fetch()` **without** `credentials: 'include'`.
   - This means browsers will NOT send the session cookie on API calls, causing `{"error":"Unauthorized"}` on every authenticated route.

## Plan

### 1. Update `website/src/unified-server.js` ✅ DONE
- Add `app.set('trust proxy', 1)` since Render uses proxies.
- Update session config:
  - `secure: process.env.NODE_ENV === 'production'`
  - `sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'`
  - `proxy: true`
- Update CORS config:
  - `origin: true` (reflects request origin)
  - `credentials: true`

### 2. Update `website/src/server.js` ✅ DONE
- Apply identical session and CORS fixes as `unified-server.js`.

### 3. Update Frontend JS Files ✅ DONE
Add `credentials: 'include'` to **all** `fetch()` calls in:
- `website/public/js/certification.js`
- `website/public/js/learning.js`
- `website/public/js/scripts.js`
- `website/public/js/lessons.js`

### 4. Verify `isAuthenticated` Middleware
- Already uses `req.session?.user` correctly — no changes needed.

## Dependent Files to Edit
- `website/src/unified-server.js` ✅
- `website/src/server.js` ✅
- `website/public/js/certification.js` ✅
- `website/public/js/learning.js` ✅
- `website/public/js/scripts.js` ✅
- `website/public/js/lessons.js` ✅

### 5. Rate Limit Fix ✅ DONE
**`website/src/middleware/auth.js`**
- Updated `isAuthenticated` to only verify Discord tokens **once per hour** instead of on every request.
- Added `tokenVerifiedAt` timestamp tracking to session user.

**`website/src/routes/auth.js`**
- Set `tokenVerifiedAt: Date.now()` during login.
- Added OAuth `state` parameter generation for CSRF protection.

**`website/src/middleware/auth.js`**
- Added retry logic with exponential backoff to `exchangeOAuthCode`:
  - 3 retries with delays: 1s, 2s, 4s
  - Only retries on HTTP 429 (rate limit)

## Follow-up Steps
- [ ] Redeploy to Render.
- [ ] Test login flow: check that session cookie is set and sent on subsequent API requests.
- [ ] Monitor browser Network tab to confirm `Cookie` header is present on authenticated fetch calls.
- [ ] Verify no more Discord API rate limit errors in logs.

