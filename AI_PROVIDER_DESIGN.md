# Multi-Provider AI Fallback System Design

## Overview

The system now supports **automatic failover** from Claude (Anthropic) to Gemini (Google). If Claude fails, Gemini will automatically take over without any manual intervention.

## Architecture

```
                           ┌─────────────────┐
                           │  Request        │
                           │  (image file)   │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │  AIProvider     │
                           │  (abstraction)  │
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼────────┐      │               │
           │  Try Claude     │      │               │
           │  (Primary)      │      │               │
           └────────┬────────┘      │               │
                    │               │               │
           ┌────────▼────────┐      │               │
           │ Success?        │      │               │
           │ YES → Return    │      │               │
           │ NO → Error      │      │               │
           └────────┬────────┘      │               │
                    │               │               │
           ┌────────▼────────┐      │               │
           │  Try Gemini     │◄─────┼───────────────┘
           │  (Fallback)     │      │
           └────────┬────────┘      │
                    │               │
           ┌────────▼────────┐      │
           │ Success?        │      │
           │ YES → Return    │      │
           │ NO → Error      │      │
           └────────┬────────┘      │
                    │               │
                    └───────────────┘
```

## Configuration

### Environment Variables

```bash
# At least ONE of these must be set. Both are recommended for fallback.

# Anthropic Claude API Key (Primary Provider)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Google Generative AI API Key (Fallback Provider)
# Get from: https://ai.google.dev/
GOOGLE_API_KEY=your-google-api-key-here
```

**Note:** If neither key is set, the system will throw an error on startup.

## How It Works

### 1. **Provider Initialization** (`aiProvider.js`)

```javascript
const aiProvider = getAIProvider();
// Initializes both clients if keys are available
// If both fail to initialize, throws error immediately
```

### 2. **Graceful Fallback** (`generateWithFallback`)

```javascript
const responseText = await aiProvider.generateWithFallback(
  imageBuffer,
  mimeType,
  systemPrompt
);
```

**Process:**
1. ✅ Try Claude first
2. ❌ If Claude fails → Log warning + retry
3. ❌ If Claude exhausted retries → Try Gemini
4. ✅ Gemini processes successfully → Return result
5. ❌ If both fail → Throw error (handled by controller)

### 3. **Rate Limiting Handling**

Both providers retry automatically with exponential backoff:

```
Attempt 1: Wait 15 seconds
Attempt 2: Wait 25 seconds  
Attempt 3: Wait 35 seconds
(Max 3 attempts by default)
```

If rate-limited on Claude, it will automatically try Gemini instead of failing.

### 4. **Image Format Normalization**

Each provider has different image format requirements:

**Claude (Anthropic):**
```javascript
{
  type: "image",
  source: {
    type: "base64",
    media_type: "image/png",
    data: "base64_encoded_data"
  }
}
```

**Gemini (Google):**
```javascript
{
  inlineData: {
    mimeType: "image/png",
    data: "base64_encoded_data"
  }
}
```

The `AIProvider` class handles this conversion internally.

## API Changes

### Controllers Updated

1. **gradeController.js**
   - Removed: `import Anthropic`
   - Removed: `formatBufferToClaudePart()` (now in AIProvider)
   - Removed: `generateWithRetry()` (now in AIProvider)
   - Added: `getAIProvider()` import
   - Updated: `processWorksheets()` to use `aiProvider.generateWithFallback()`

2. **studentController.js**
   - Same changes as gradeController.js
   - Updated: `gradeStudentTest()` function

### Health Check Endpoint

```
GET /api/health
```

**Response:**
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

This shows which providers are available and which is primary/fallback.

## Error Handling

### Scenarios

| Scenario | Behavior |
|----------|----------|
| Claude available, Gemini not | Uses Claude only |
| Gemini available, Claude not | Uses Gemini only |
| Both available | Tries Claude first, falls back to Gemini |
| Neither available | Throws error at startup |
| Claude rate-limited | Retries Claude, then tries Gemini |
| Both rate-limited | Retries both with exponential backoff |
| Claude API key invalid | Falls back to Gemini (if available) |
| Gemini API key invalid | Falls back to Claude (if available) |

### Error Messages

When grading fails:
- Submission marked as "Manual Review Required"
- Error summary recorded for teacher review
- User gets detailed error message

## Cost Optimization

### Default Batch Settings

```bash
CLAUDE_BATCH_SIZE=2          # Process 2 files in parallel (prevents rate limits)
CLAUDE_BATCH_DELAY_MS=1000   # 1 second delay between batches
```

### When to Adjust

- **Increase batch size**: If Gemini fallback available (safer)
- **Decrease batch size**: If hitting rate limits consistently
- **Increase delay**: If frequently falling back to Gemini

## Monitoring

### Logs to Watch

**Claude Attempt:**
```
[AIProvider] Attempting Claude...
```

**Fallback Triggered:**
```
[AIProvider] Claude failed: <error message>
[AIProvider] Claude failed, attempting Gemini...
```

**Success:**
```
[AIProvider] Gemini succeeded
```

**Rate Limiting:**
```
[Claude] 429 Quota Exceeded. Retrying in 15 seconds... (Attempt 1 of 3)
```

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install
# This installs both @anthropic-ai/sdk and @google/generative-ai
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API keys
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_API_KEY=your-google-key
```

### 3. Test the Setup

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Should show something like:
{
  "status": "ok",
  "aiProviders": {
    "claude": true,
    "gemini": true,
    "primary": "Claude",
    "fallback": "Gemini"
  }
}
```

## Migration from Old System

### Before (Claude-Only)

```javascript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const result = await client.messages.create({...});
```

### After (Multi-Provider)

```javascript
import { getAIProvider } from '../utils/aiProvider.js';
const aiProvider = getAIProvider();
const responseText = await aiProvider.generateWithFallback(
  buffer, mimeType, systemPrompt
);
```

## FAQ

**Q: What if Claude is slow but not failing?**
A: Claude will still be used. The fallback only triggers on actual failures (API errors, rate limits, etc).

**Q: Can I force using only Gemini?**
A: Set `ANTHROPIC_API_KEY=""` (empty). The provider will only initialize Gemini.

**Q: Will the switch to Gemini affect grading quality?**
A: Both use similar models. Gemini 2.0 Flash is comparable to Claude Opus 4.1 for math grading.

**Q: Are there cost implications?**
A: Yes. Claude and Gemini have different pricing. Monitor your API usage in their dashboards.

**Q: What if both providers are down?**
A: The request will fail and the submission will be marked for manual review by teachers.

**Q: Can I add another provider later?**
A: Yes! The `AIProvider` class is extensible. You can add methods like `generateWithDeepSeek()` and integrate them into `generateWithFallback()`.

## Future Enhancements

- [ ] Add metrics tracking (which provider was used, success rates)
- [ ] Add provider selection preference per session
- [ ] Add caching for identical images
- [ ] Add provider performance comparison
- [ ] Support for additional providers (OpenAI, Mistral, etc.)

## Troubleshooting

### Issue: "No AI API keys configured"

**Solution:** 
```bash
# Verify keys in .env
cat .env | grep -E "ANTHROPIC_API_KEY|GOOGLE_API_KEY"

# Should output:
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

### Issue: Both providers timing out

**Solution:**
- Check internet connectivity
- Verify API keys are valid (not expired)
- Check rate limit status on both provider dashboards
- Reduce CLAUDE_BATCH_SIZE
- Increase CLAUDE_BATCH_DELAY_MS

### Issue: Gemini fallback not working

**Solution:**
- Verify GOOGLE_API_KEY is set correctly in .env
- Check `/api/health` endpoint shows `"gemini": true`
- Look at logs for specific error message

---

**Last Updated:** June 21, 2026
**System Version:** 2.0 (Multi-Provider)
**Status:** Production Ready ✅
