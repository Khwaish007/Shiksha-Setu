# Quick Reference: Multi-Provider AI Fallback

## TL;DR

✅ Claude fails? → Automatically uses Gemini. No manual intervention needed.

## Installation (5 minutes)

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Get Gemini key from https://ai.google.dev/

# 3. Update .env
ANTHROPIC_API_KEY=sk-ant-your-existing-key
GOOGLE_API_KEY=AIzaSy_your_new_key

# 4. Test
curl http://localhost:3000/api/health
```

## How It Works

```
Image Upload 
    ↓
Claude Available? 
    ├─ YES → Use Claude → Done ✅
    ├─ NO or FAILS → Try Gemini
        ├─ YES → Use Gemini → Done ✅
        └─ NO → Manual Review Required ❌
```

## Key Files

| File | Purpose |
|------|---------|
| `src/utils/aiProvider.js` | Core abstraction (NEW) |
| `src/controllers/gradeController.js` | Uses AIProvider (UPDATED) |
| `src/controllers/studentController.js` | Uses AIProvider (UPDATED) |
| `package.json` | Added Gemini SDK (UPDATED) |
| `.env.example` | Added GOOGLE_API_KEY (UPDATED) |

## API Keys

| Provider | Key Name | Get From |
|----------|----------|----------|
| Claude | ANTHROPIC_API_KEY | https://console.anthropic.com/ |
| Gemini | GOOGLE_API_KEY | https://ai.google.dev/ |

**Need Both?** No, but recommended for true fallback.

## Health Check

```bash
curl http://localhost:3000/api/health
```

Response shows:
- `"claude": true/false` - Claude available
- `"gemini": true/false` - Gemini available
- `"primary": "Claude"` - Which tries first
- `"fallback": "Gemini"` - Which tries if primary fails

## Configuration

### Full Redundancy (Recommended)
```env
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_API_KEY=AIzaSy-your-key
CLAUDE_BATCH_SIZE=2
CLAUDE_BATCH_DELAY_MS=1000
```

### Claude Primary Only
```env
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_API_KEY=
```

### Gemini Primary Only
```env
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=AIzaSy-your-key
```

## Logs to Monitor

### Successful Upload
```
[AIProvider] Attempting Claude...
[AIProvider] Claude succeeded
```

### Fallback in Action
```
[AIProvider] Attempting Claude...
[AIProvider] Claude failed: [error details]
[AIProvider] Claude failed, attempting Gemini...
[AIProvider] Gemini succeeded
```

### Rate Limiting
```
[Claude] 429 Quota Exceeded. Retrying in 15 seconds... (Attempt 1 of 3)
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "No AI API keys" | Add at least one key to .env |
| Health shows false | Verify key is correct (check for spaces) |
| Fallback not working | Ensure GOOGLE_API_KEY is set correctly |
| Both failing | Check provider status dashboards |
| Rate limit issues | Reduce CLAUDE_BATCH_SIZE to 1 |

## Performance

| Scenario | Time |
|----------|------|
| Claude success | ~2-3s |
| Claude fails → Gemini | ~30-45s |
| Both unavailable | ~45s (timeouts) |

*Note: Fallback includes retry delays (~15s each)*

## Cost

| Provider | Input/1M tokens | Output/1M tokens |
|----------|-----------------|------------------|
| Claude | $3 | $15 |
| Gemini | $0.075 | $0.30 |

Gemini ~40x cheaper (but uses Gemini as fallback only).

## Deployment

```bash
# 1. npm install (adds @google/generative-ai)
# 2. Add GOOGLE_API_KEY to production .env
# 3. Keep ANTHROPIC_API_KEY (no changes)
# 4. Test health endpoint
# 5. Deploy
# 6. Monitor logs for 24 hours
```

## Files Created/Modified

**Created:**
- `src/utils/aiProvider.js` (new abstraction)
- `AI_PROVIDER_DESIGN.md` (full docs)
- `SETUP_DUAL_AI.md` (setup guide)
- `SYSTEM_CHANGES_SUMMARY.md` (detailed changes)
- `QUICK_REFERENCE.md` (this file)

**Modified:**
- `package.json` (added @google/generative-ai)
- `.env.example` (added GOOGLE_API_KEY)
- `src/app.js` (enhanced health endpoint)
- `src/controllers/gradeController.js` (uses AIProvider)
- `src/controllers/studentController.js` (uses AIProvider)

## Code Changes

### Before (Claude Only)
```javascript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});
const result = await generateWithRetry(client, prompt, imagePart);
```

### After (Multi-Provider)
```javascript
import { getAIProvider } from '../utils/aiProvider.js';
const aiProvider = getAIProvider();
const response = await aiProvider.generateWithFallback(buffer, mimeType, prompt);
```

## No Breaking Changes ✅

All endpoints work exactly the same:
- `/api/v1/grading/process` - unchanged
- `/api/students/:id/grade` - unchanged
- `GET /api/health` - enhanced (shows provider status)

## Testing

### 1. Local Test
```bash
npm start
curl http://localhost:3000/api/health
```

### 2. Upload Test
- Upload image through app
- Check logs for `[AIProvider]` messages

### 3. Fallback Test
- Temporarily disable ANTHROPIC_API_KEY
- Upload image
- Should see fallback to Gemini in logs

## Support

- **Claude Issues?** → https://status.anthropic.com/
- **Gemini Issues?** → https://status.cloud.google.com/
- **Code Issues?** → Read `SYSTEM_CHANGES_SUMMARY.md`
- **Setup Issues?** → Read `SETUP_DUAL_AI.md`
- **Architecture?** → Read `AI_PROVIDER_DESIGN.md`

## One Minute Setup

```bash
# Step 1: Install
cd backend && npm install

# Step 2: Get key
# Go to https://ai.google.dev/ → Get API Key

# Step 3: Add to .env
echo "GOOGLE_API_KEY=your-key-here" >> .env

# Step 4: Test
npm start &
sleep 2
curl http://localhost:3000/api/health

# Done! ✅
```

---

**Version:** 2.0 (Multi-Provider)
**Status:** Production Ready ✅
**Setup Time:** 5 minutes
**Breaking Changes:** None ✅
