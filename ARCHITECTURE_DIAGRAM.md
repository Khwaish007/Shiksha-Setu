# Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│  (React - No Changes Required)                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Image Upload
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    Express Backend                           │
├──────────────────────────────────────────────────────────────┤
│  POST /api/v1/grading/process                                │
│  POST /api/students/:id/grade                                │
│  GET /api/health                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              AI Provider Abstraction Layer                    │
│           (NEW: src/utils/aiProvider.js)                     │
├──────────────────────────────────────────────────────────────┤
│  • Initializes both clients                                  │
│  • Manages fallback logic                                    │
│  • Handles rate limiting                                     │
│  • Normalizes image formats                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ↓                     ↓
   ┌─────────────┐      ┌──────────────┐
   │   Claude    │      │    Gemini    │
   │ (Primary)   │      │  (Fallback)  │
   │ Anthropic   │      │    Google    │
   └─────────────┘      └──────────────┘
        │                     │
        └──────────┬──────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │   Grading Result     │
        │   (Normalized JSON)  │
        └──────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ↓                     ↓
    ┌────────┐          ┌─────────┐
    │MongoDB │          │Frontend │
    │ (Save) │          │(Display)│
    └────────┘          └─────────┘
```

## Request Flow with Fallback

### Scenario 1: Claude Success (Happy Path)

```
User Uploads Image
        │
        ↓
   AIProvider
        │
        ├─ Check: Claude key configured? ✓
        │
        ├─ Try Claude
        │  │
        │  ├─ Format image for Claude ✓
        │  │
        │  ├─ Call client.messages.create() ✓
        │  │
        │  └─ Parse response ✓
        │
        └─ Return result to controller
                │
                ↓
         Save to MongoDB
                │
                ↓
         Return to Frontend ✓
```

### Scenario 2: Claude Fails, Gemini Succeeds (Fallback)

```
User Uploads Image
        │
        ↓
   AIProvider
        │
        ├─ Check: Claude key configured? ✓
        │
        ├─ Try Claude
        │  │
        │  ├─ Format image for Claude ✓
        │  │
        │  ├─ Call client.messages.create() ✗ (Error!)
        │  │
        │  ├─ Rate limited? Retry 3 times... ✗
        │  │
        │  └─ FAIL - Log warning
        │
        ├─ Check: Gemini key configured? ✓
        │
        ├─ Try Gemini
        │  │
        │  ├─ Format image for Gemini ✓
        │  │
        │  ├─ Call model.generateContent() ✓
        │  │
        │  └─ Parse response ✓
        │
        └─ Return result to controller
                │
                ↓
         Save to MongoDB
                │
                ↓
         Return to Frontend ✓
```

### Scenario 3: Both Providers Fail (Manual Review)

```
User Uploads Image
        │
        ↓
   AIProvider
        │
        ├─ Try Claude ✗
        ├─ Retry Claude... ✗
        │
        ├─ Try Gemini ✗
        ├─ Retry Gemini... ✗
        │
        └─ Throw Error
                │
                ↓
      Controller catches error
                │
                ↓
     Mark as "Manual Review Required"
                │
                ↓
         Save to MongoDB
                │
                ↓
    Teacher notified to grade manually
```

## Code Flow Diagram

### Controller (gradeController.js)

```
processWorksheets(req, res)
    │
    ├─ Validate session exists
    │
    ├─ For each uploaded file:
    │  │
    │  ├─ validateUploadedImage() → Check if valid image
    │  │
    │  ├─ getAIProvider() → Get singleton instance
    │  │
    │  ├─ aiProvider.generateWithFallback() → ⭐ KEY CALL
    │  │  │
    │  │  └─ (See AIProvider Flow Below)
    │  │
    │  ├─ parseAndNormalizeGradingResponse() → Parse JSON
    │  │
    │  └─ Save to MongoDB
    │
    └─ Return results to frontend
```

## AIProvider Flow

```
generateWithFallback(buffer, mimeType, systemPrompt)
    │
    ├─ IF this.claudeClient exists:
    │  │
    │  └─ Call generateWithClaude()
    │     │
    │     ├─ For each retry (max 3):
    │     │  │
    │     │  ├─ formatImageForClaude() → Convert buffer
    │     │  │
    │     │  ├─ client.messages.create()
    │     │  │  │
    │     │  │  ├─ Success? → Return response text
    │     │  │  │
    │     │  │  └─ Error? → Check if rate limit
    │     │  │     ├─ Yes? → Wait 15s, retry
    │     │  │     └─ No? → Throw error
    │     │  │
    │     │  └─ (increment wait time)
    │     │
    │     └─ All retries failed → Throw error
    │
    ├─ Claude threw error OR not configured:
    │  │
    │  └─ IF this.geminiClient exists:
    │     │
    │     └─ Call generateWithGemini()
    │        │
    │        ├─ For each retry (max 3):
    │        │  │
    │        │  ├─ formatImageForGemini() → Convert buffer
    │        │  │
    │        │  ├─ model.generateContent()
    │        │  │  │
    │        │  │  ├─ Success? → Return response text
    │        │  │  │
    │        │  │  └─ Error? → Check if rate limit
    │        │  │     ├─ Yes? → Wait 15s, retry
    │        │  │     └─ No? → Throw error
    │        │  │
    │        │  └─ (increment wait time)
    │        │
    │        └─ All retries failed → Throw error
    │
    └─ Neither provider available:
       │
       └─ Throw "All AI providers failed" error
```

## Data Flow: Image Processing

```
Frontend
    │
    ├─ User selects image file
    │
    └─ FormData with multipart/form-data
                    │
                    ↓
          multer middleware
                    │
        ┌───────────┴───────────┐
        │                       │
        └─ req.files[0].buffer  │
                    │           │
                    ├─ .mimetype: "image/png"
                    ├─ .size: 245023
                    ├─ .originalname: "test.png"
                    └─ .buffer: <Buffer ...>
                    │
                    ↓
          AIProvider.generateWithFallback()
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
    Claude                   Gemini
    (Format A)              (Format B)
        │                       │
        ├─ type: "image"        ├─ inlineData
        ├─ source              │
        │  ├─ type: "base64"   ├─ mimeType
        │  ├─ media_type       └─ data
        │  └─ data
        │
        └─────────┬─────────┘
                  │
        Response: JSON string
                  │
        ┌─────────┴─────────┐
        │                   │
        ↓                   ↓
    Parse JSON        Normalize payload
        │                   │
        ├─ totalScore       ├─ Extract score
        ├─ mistakes[]       ├─ Extract mistakes
        ├─ studentName      ├─ Extract name
        └─ status           └─ Extract status
                            │
                            ↓
                      Save to MongoDB
                            │
                            ↓
                      Return to Frontend
```

## Initialization Sequence

```
Backend Startup (src/server.js)
    │
    ├─ Load environment variables (dotenv)
    │
    ├─ Import src/app.js
    │  │
    │  ├─ require gradeRoutes
    │  ├─ require studentRoutes
    │  └─ require gradingSafety utilities
    │
    └─ Middleware registered
                    │
    First Request Arrives
                    │
                    ├─ GET /api/health
                    │  │
                    │  ├─ Call getAIProvider()
                    │  │  │
                    │  │  ├─ Check if singleton exists? No
                    │  │  │
                    │  │  └─ Create new AIProvider()
                    │  │     │
                    │  │     ├─ IF ANTHROPIC_API_KEY:
                    │  │     │  └─ new Anthropic({apiKey})
                    │  │     │
                    │  │     ├─ IF GOOGLE_API_KEY:
                    │  │     │  └─ new GoogleGenerativeAI(key)
                    │  │     │
                    │  │     └─ IF neither:
                    │  │        └─ throw Error
                    │  │
                    │  ├─ Return status with provider info
                    │  │
                    │  └─ ✓ Clients ready for grading requests
                    │
                    └─ Ready to accept grading requests!
```

## Error Handling Flow

```
generateWithFallback()
        │
        ├─ Try Claude
        │  │
        │  └─ Error occurred
        │     │
        │     ├─ Check error.status === 429?
        │     │  ├─ YES: Rate limit → Wait & retry
        │     │  └─ NO: Other error → Re-throw
        │     │
        │     └─ Throw to next level
        │
        ├─ Catch in fallback handler
        │  │
        │  ├─ Log warning with error message
        │  │
        │  └─ IF Gemini available → Try Gemini
        │     │
        │     └─ Gemini goes through same flow
        │
        └─ IF all fail
           │
           └─ Throw "All AI providers failed"
                    │
                    ↓
           Controller catches
                    │
                    ├─ Create manual review payload
                    ├─ Save to MongoDB
                    └─ Return error to user
                             │
                             ↓
                        Teacher reviews manually
```

## Provider State Machine

```
Initialization Phase
        │
        ├─ No keys set → ERROR STATE ✗
        │
        ├─ Claude only → CLAUDE PRIMARY
        │
        ├─ Gemini only → GEMINI PRIMARY
        │
        └─ Both → DUAL REDUNDANCY ✓ (RECOMMENDED)

Processing Phase (Dual Redundancy)
        │
        ├─ Claude Available ✓
        │  │
        │  ├─ Try Claude → Success → CLAUDE USED
        │  │
        │  ├─ Try Claude → Failure → FALLBACK
        │  │  │
        │  │  ├─ Gemini Available ✓
        │  │  │  │
        │  │  │  └─ Try Gemini → GEMINI USED
        │  │  │
        │  │  └─ Gemini Not Available ✗
        │  │     │
        │  │     └─ MANUAL REVIEW REQUIRED
        │  │
        │  └─ Try Claude → Rate Limited
        │     │
        │     ├─ Retry (3x) → Success → CLAUDE USED
        │     │
        │     └─ Retry (3x) → Failure → FALLBACK to Gemini
        │
        └─ Claude Not Available
           │
           └─ Try Gemini → GEMINI USED or MANUAL REVIEW
```

## Summary

The system is designed with:
- ✅ **Single Point of Configuration** - AIProvider class
- ✅ **Graceful Degradation** - Falls back automatically
- ✅ **Exponential Backoff** - Respects rate limits
- ✅ **Error Isolation** - Each provider failure doesn't crash system
- ✅ **Monitoring Ready** - All states loggable and trackable
- ✅ **Easy Extension** - Add more providers by adding methods

---

**Last Updated:** June 21, 2026
