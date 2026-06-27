# Quick Setup: Dual AI Provider (Claude + Gemini Fallback)

## What You Need

1. ✅ Existing Claude API key from Anthropic (optional if using Gemini)
2. ✅ New Google API key from Google AI Studio (optional if keeping Claude)
3. ✅ Already installed backend dependencies

## Step-by-Step Setup

### Step 1: Install New Dependencies

```bash
cd backend
npm install
```

This adds `@google/generative-ai` package alongside the existing Anthropic SDK.

### Step 2: Get Your API Keys

#### Claude Key (if you have one)
- Already at: https://console.anthropic.com/
- Keep your existing `ANTHROPIC_API_KEY`

#### Google Gemini Key (NEW - Required for fallback)
1. Go to https://ai.google.dev/
2. Click "Get API Key" button
3. Create new API key in Google Cloud Console
4. Copy the key

### Step 3: Update .env File

```bash
cd backend
nano .env
# or
code .env
```

Add/update these lines:

```env
# Existing key (keep this)
ANTHROPIC_API_KEY=sk-ant-your-existing-key

# NEW: Add Gemini key
GOOGLE_API_KEY=AIzaSy_your_new_google_key_here

# Rest of your config stays the same
MONGO_URI=...
FRONTEND_URL=...
```

### Step 4: Verify Setup

```bash
# Start backend
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/api/health
```

Expected output:
```json
{
  "status": "ok",
  "timestamp": "2026-06-21T10:30:00.000Z",
  "aiProviders": {
    "claude": true,
    "gemini": true,
    "primary": "Claude",
    "fallback": "Gemini"
  }
}
```

### Step 5: Test Fallback

Upload a test image through the app. In backend logs, you should see:

**Normal case (Claude works):**
```
[AIProvider] Attempting Claude...
[AIProvider] Claude succeeded
```

**Fallback case (Claude fails, Gemini takes over):**
```
[AIProvider] Attempting Claude...
[AIProvider] Claude failed: <error>
[AIProvider] Claude failed, attempting Gemini...
[AIProvider] Gemini succeeded
```

## Configuration Options

### Minimal Setup (Fallback Only)

If you ONLY want Gemini (no Claude):

```env
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=AIzaSy_your_key
```

### Full Redundancy (Both Keys)

```env
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_API_KEY=AIzaSy_your-key
```

**Recommended** for production. If Claude has issues, Gemini handles requests.

## Files Changed

### New Files
- `backend/src/utils/aiProvider.js` - Core abstraction layer
- `AI_PROVIDER_DESIGN.md` - Full documentation
- `SETUP_DUAL_AI.md` - This file

### Modified Files
- `backend/package.json` - Added @google/generative-ai
- `backend/.env.example` - Updated with GOOGLE_API_KEY
- `backend/src/app.js` - Updated health check
- `backend/src/controllers/gradeController.js` - Uses AIProvider
- `backend/src/controllers/studentController.js` - Uses AIProvider

## Costs & Pricing

### Claude (Anthropic)
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens
- Check: https://www.anthropic.com/pricing

### Gemini (Google)
- Input: Free for first 15 requests/minute
- Paid: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Check: https://ai.google.dev/pricing

## Monitoring Usage

### Anthropic Console
- Log in at: https://console.anthropic.com/
- View usage under "Usage" tab

### Google AI Studio
- Log in at: https://aistudio.google.com/
- View API usage in project settings

## Troubleshooting

### Error: "No AI API keys configured"
```
Solution: Ensure at least ONE key is set in .env
```

### Health check shows `"claude": false, "gemini": false`
```
Solution: API keys not loaded properly
- Check .env file syntax
- Restart backend: npm start
- Verify keys don't have extra spaces
```

### Gemini not working despite correct key
```
Solution: Verify API is enabled
- Go to Google Cloud Console
- Enable "Generative Language API"
- Create billing account if needed (free tier exists)
```

### Getting rate-limited on both providers
```
Solution: Reduce batch processing
- Set in .env: CLAUDE_BATCH_SIZE=1
- Increase delay: CLAUDE_BATCH_DELAY_MS=3000
```

## Need Help?

- **Claude Issues?** → Check Anthropic status: https://status.anthropic.com/
- **Gemini Issues?** → Check Google status: https://status.cloud.google.com/
- **Code Issues?** → Read `AI_PROVIDER_DESIGN.md` for architecture details

## Next Steps

1. ✅ Install dependencies
2. ✅ Add API keys to .env
3. ✅ Run health check
4. ✅ Upload a test image
5. ✅ Monitor logs during upload
6. 🚀 Deploy to production!

---

**Setup Time:** ~5 minutes
**Testing Time:** ~2 minutes
**Total:** 7 minutes to full redundancy ✅
