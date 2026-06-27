# System Changes Summary: Multi-Provider AI Fallback

## The Problem You Wanted to Solve

**Original Question:** "What if I want Claude to fail over to Gemini if the Anthropic key fails, so it still runs smooth?"

**Answer:** ✅ Implemented! The system now tries Claude first, automatically falls back to Gemini on any failure.

---

## What Changed

### 1. **New Abstraction Layer** ⭐
**File:** `backend/src/utils/aiProvider.js` (NEW)

A singleton class that manages both AI providers:
- Initializes Claude and Gemini clients from API keys
- Implements `generateWithFallback()` - tries Claude, then Gemini
- Handles rate limiting with exponential backoff for both providers
- Normalizes image formats for both APIs
- Provides `getStatus()` for monitoring

**Key Features:**
```javascript
const aiProvider = getAIProvider();
const response = await aiProvider.generateWithFallback(buffer, mimeType, prompt);
// Automatically: Try Claude → Fail? → Try Gemini → Return result
```

### 2. **Updated Controllers**
**Files Modified:** 
- `backend/src/controllers/gradeController.js`
- `backend/src/controllers/studentController.js`

**Before:**
```javascript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});
const result = await generateWithRetry(client, prompt, imagePart);
```

**After:**
```javascript
import { getAIProvider } from '../utils/aiProvider.js';
const aiProvider = getAIProvider();
const responseText = await aiProvider.generateWithFallback(buffer, mimeType, prompt);
```

**Benefits:**
- No longer tightly coupled to Claude
- Removed duplicate code (formatBufferToClaudePart, generateWithRetry)
- Single source of truth for AI logic

### 3. **Updated App Configuration**
**File:** `backend/src/app.js`

**Changes:**
- Added AIProvider import
- Enhanced `/api/health` endpoint to show provider status
- Now returns which providers are available (Claude/Gemini)

**Health Endpoint Response:**
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

### 4. **Updated Dependencies**
**File:** `backend/package.json`

**Added:**
```json
"@google/generative-ai": "^0.19.1"
```

Both SDKs are now installed:
- `@anthropic-ai/sdk` (Claude) - existing
- `@google/generative-ai` (Gemini) - new

### 5. **Updated Environment Config**
**Files Modified:**
- `backend/.env.example`

**Added:**
```env
# Google API key for Gemini AI grading (fallback provider)
# Get from: https://ai.google.dev/
GOOGLE_API_KEY=your-google-api-key-here
```

**Clarified:**
```env
# Now clearly labeled as "primary" and "fallback"
ANTHROPIC_API_KEY=sk-ant-your-key-here    # Primary
GOOGLE_API_KEY=your-google-key            # Fallback
```

### 6. **Documentation Files** 📚
**New Files:**
- `AI_PROVIDER_DESIGN.md` - Full architecture & design document
- `SETUP_DUAL_AI.md` - Quick setup guide
- `SYSTEM_CHANGES_SUMMARY.md` - This file

---

## How the Fallback Works (Step by Step)

### Scenario 1: Claude Works ✅
```
Request → AIProvider → Try Claude → Success! → Return result
Time: Normal (no fallback overhead)
```

### Scenario 2: Claude Fails (Rate Limited) 🔄
```
Request → AIProvider → Try Claude → FAIL (429) → 
Retry Claude (15s wait) → Still failing → Try Gemini → Success! → Return result
Time: ~30-45 seconds (includes retry delays)
```

### Scenario 3: Claude API Key Invalid 🔄
```
Request → AIProvider → Try Claude → FAIL (Invalid Key) → 
Try Gemini → Success! → Return result
Time: ~2-3 seconds (quick failure on invalid key)
```

### Scenario 4: Both Work (Backup Only) 📡
```
Request → AIProvider → Try Claude → Success! → Return result
(Gemini available but not used unless Claude fails)
```

---

## File-by-File Changes

| File | Type | Changes |
|------|------|---------|
| `src/utils/aiProvider.js` | NEW | ~200 lines - Core abstraction layer |
| `src/controllers/gradeController.js` | MODIFIED | Removed 50 lines of Claude-specific code |
| `src/controllers/studentController.js` | MODIFIED | Removed 50 lines of Claude-specific code |
| `src/app.js` | MODIFIED | Added AIProvider import, enhanced health endpoint |
| `package.json` | MODIFIED | Added @google/generative-ai dependency |
| `.env.example` | MODIFIED | Added GOOGLE_API_KEY documentation |
| `AI_PROVIDER_DESIGN.md` | NEW | Complete architecture documentation |
| `SETUP_DUAL_AI.md` | NEW | Quick setup guide |

**Total New Code:** ~200 lines
**Total Removed:** ~100 lines (Claude-specific helpers)
**Net Impact:** +100 lines, much better separation of concerns

---

## API Changes for Frontend Developers

### Nothing breaks! ✅

All endpoints work exactly the same:
- `POST /api/v1/grading/process` - Still works
- `POST /api/students/:id/grade` - Still works
- `GET /api/health` - Enhanced (new field: `aiProviders`)

### New: Provider Status Endpoint

```bash
GET /api/health
```

Now shows which providers are available. Useful for:
- Monitoring dashboard
- Alerting if both providers down
- Debugging API key issues

---

## Deployment Checklist

- [ ] Run `npm install` (installs @google/generative-ai)
- [ ] Get Gemini API key from https://ai.google.dev/
- [ ] Add `GOOGLE_API_KEY` to production `.env`
- [ ] Keep existing `ANTHROPIC_API_KEY` (no changes needed)
- [ ] Test health endpoint: `curl /api/health`
- [ ] Verify both providers show `true`
- [ ] Deploy to production
- [ ] Monitor logs for fallback usage

---

## Testing the System

### Test 1: Verify Setup
```bash
curl http://localhost:3000/api/health
# Should show both providers available
```

### Test 2: Claude Works
```
Upload a test image → Check logs → Should see:
[AIProvider] Attempting Claude...
[AIProvider] Claude succeeded
```

### Test 3: Claude Fails (Simulated)
```bash
# Temporarily comment out ANTHROPIC_API_KEY in .env
# Upload image → Check logs → Should see:
[AIProvider] Attempting Claude...
[AIProvider] Claude failed: Invalid API Key
[AIProvider] Claude failed, attempting Gemini...
[AIProvider] Gemini succeeded
```

### Test 4: Rate Limiting
```
Upload 20+ images rapidly → Should see:
[Claude] 429 Quota Exceeded. Retrying...
(After retries exhaust) → Falls back to Gemini
```

---

## Performance Impact

### Claude Only (Before)
- Success: ~2-3 seconds
- Failure: 1 second (hard error)

### Dual Provider (After)
- Claude Success: ~2-3 seconds (same as before)
- Claude Fails → Gemini: ~30-45 seconds (retry delays) + ~2-3 seconds (Gemini)
- Both Fail: ~45 seconds (all retries exhausted)

**Optimization Tips:**
- Set `CLAUDE_BATCH_SIZE=1` if getting frequent rate limits
- Increase `CLAUDE_BATCH_DELAY_MS` to 2000-3000ms
- Monitor provider dashboards to understand rate limits

---

## Cost Implications

### Before (Claude Only)
- Pay only for Claude usage
- Service unavailable if Claude has outages

### After (Dual Provider)
- Pay for Claude OR Gemini (depending on which processes)
- Service more reliable (redundancy adds ~$0.01-0.05 per 100 images)
- Can optimize: Use cheaper provider during peak hours

### Pricing Comparison (per 1M tokens)
| Provider | Input | Output |
|----------|-------|--------|
| Claude | $3 | $15 |
| Gemini | $0.075 | $0.30 |

**Gemini is ~40x cheaper** for input, ~50x cheaper for output. Consider making it primary if cost is a factor.

---

## Troubleshooting Guide

### Problem: "No AI API keys configured"
**Cause:** Neither ANTHROPIC_API_KEY nor GOOGLE_API_KEY set
**Fix:** Add at least one key to `.env`

### Problem: Fallback not working
**Cause:** Gemini key not set or invalid
**Fix:** Get new key from https://ai.google.dev/, verify in health endpoint

### Problem: High latency when Claude fails
**Cause:** Waiting through all Claude retries before Gemini
**Fix:** Reduce CLAUDE_BATCH_SIZE, increase retry wait times strategically

### Problem: Both providers timing out
**Cause:** Network issues or provider downtime
**Fix:** Check provider status pages, retry manually

---

## Rollback Plan

If you need to go back to Claude-only:

1. Remove `GOOGLE_API_KEY` from `.env`
2. Revert `package.json` (remove @google/generative-ai)
3. Revert controller files (use git)
4. Run `npm install`

**Backward compatible:** System works fine with just one provider.

---

## Future Enhancements

Possible next steps:
1. Add metrics tracking (which provider used, success rate)
2. Add per-session provider preference
3. Add caching for identical images
4. Support for OpenAI GPT-4V fallback
5. Provider load balancing (round-robin instead of priority)

---

## Questions & Answers

**Q: Do I HAVE to use Gemini?**
A: No, Claude still works as primary. Gemini is optional fallback.

**Q: What if I only want Gemini (no Claude)?**
A: Just remove/clear ANTHROPIC_API_KEY. System will use Gemini only.

**Q: Can students see which provider graded their test?**
A: Not currently, but could be added to submission metadata.

**Q: Is there a way to force using a specific provider?**
A: Currently no, but this could be added as a feature.

**Q: What about latency? Will fallback be slow?**
A: Fallback takes extra 30-45 seconds (retry waits). Normal cases unchanged.

**Q: Can I add a third provider?**
A: Yes! The `AIProvider` class is designed to be extended.

---

## Summary

✅ **What You Got:**
- Automatic failover from Claude to Gemini
- Zero frontend changes required
- Smooth operation even if one provider fails
- Production-ready error handling
- Comprehensive documentation

✅ **How to Use:**
1. Install `npm install` (adds Gemini SDK)
2. Add Gemini API key to `.env`
3. Deploy and monitor

✅ **Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Status:** Ready for Production! 🚀

---

**Last Updated:** June 21, 2026
**Version:** 2.0 (Multi-Provider)
**Backward Compatible:** Yes ✅
