# Mermaid Diagrams — Shiksha Setu Presentation Part 1
# Render each block at https://mermaid.live → export PNG (1400×900px recommended)
# Then include the PNG in the LaTeX slide at the \flowplaceholder{} location.

---

## DIAGRAM 1 — User Flow (Slide 6)
**File to export:** `userflow.png`

```mermaid
flowchart TD
  A[📸 Teacher uploads\nworksheet photo] --> B{Answer key\nin session?}
  B -->|Yes – use key| C[Build grading prompt\nwith answer key as ground truth]
  B -->|No – use LLM knowledge| C
  C --> D[🤖 Claude Opus 4.1\nGrades worksheet via Vision API]
  D --> E{Confidence check\nper question}
  E -->|All questions ≥ 0.72| F[✅ Grade ACCEPTED\nSaved to MongoDB]
  E -->|Any question < 0.72| G[⚠️ Needs Teacher Review\nHeld in queue]
  G --> H{Teacher\ndecision}
  H -->|Approve| F
  H -->|Reject| I[🚫 Manual Review\nFlagged for teacher]
  F --> J[📊 Dashboard updates\nHeatmap · Rankings · Error DNA]
  J --> K[🎯 Intervention plan\nPDF practice sheets generated]
  K --> L[💬 WhatsApp parent\nmessage in Hindi + English]

  style A fill:#0D9488,color:#fff,stroke:#0D9488
  style D fill:#1E293B,color:#14B8A6,stroke:#0D9488,stroke-width:2px
  style E fill:#F97316,color:#fff,stroke:#F97316
  style G fill:#F59E0B,color:#0F172A,stroke:#F59E0B
  style F fill:#10B981,color:#fff,stroke:#10B981
  style H fill:#8B5CF6,color:#fff,stroke:#8B5CF6
  style I fill:#F43F5E,color:#fff,stroke:#F43F5E
  style J fill:#8B5CF6,color:#fff,stroke:#8B5CF6
  style K fill:#0D9488,color:#fff,stroke:#0D9488
  style L fill:#25D366,color:#fff,stroke:#25D366
```

---

## DIAGRAM 2 — AI Grading Pipeline (Slide 9)
**File to export:** `pipeline.png`

```mermaid
flowchart TD
  A[📷 Image Upload\nPNG / JPG / WEBP ≤ 4 MB] --> B{Magic-byte\nvalidation}
  B -->|Invalid / corrupted| Z1[🚫 Manual Review\nReturned immediately]
  B -->|Valid| C[Normalise MIME type\nDetect jpeg/png/webp/gif]
  C --> D{Answer key\nloaded in session?}
  D -->|Yes| E[Build prompt WITH answer key\nKey is sole ground truth]
  D -->|No| F[Build prompt WITHOUT key\nLLM solves questions itself]
  E --> G[☁️ Claude Opus 4.1\nVision API call]
  F --> G
  G -->|Success| H[Parse & validate JSON\nnormalizeGradingPayload]
  G -->|HTTP 429| I[⏳ Exponential backoff\n15s → 25s → 35s, max 3 retries]
  I --> G
  G -->|Error after 3 retries| J[☁️ Gemini 2.0 Flash\nAuto-fallback call]
  J -->|Success| H
  J -->|Error| Z1
  H --> K{Confidence\ncheck per question}
  K -->|All ≥ 0.72| L[✅ Grade: SUCCESS\nSave to Submission + Student]
  K -->|Any < 0.72| M[⚠️ Grade: NEEDS REVIEW\nTeacher queue — pending]
  L --> N[Update Error DNA\nMisconception patterns stored]
  M --> N

  style A fill:#0D9488,color:#fff
  style B fill:#F97316,color:#fff
  style G fill:#1E293B,color:#14B8A6,stroke:#0D9488,stroke-width:2px
  style J fill:#1E293B,color:#F97316,stroke:#F97316,stroke-width:2px
  style I fill:#F59E0B,color:#0F172A
  style K fill:#8B5CF6,color:#fff
  style L fill:#10B981,color:#fff
  style M fill:#F59E0B,color:#0F172A
  style Z1 fill:#F43F5E,color:#fff
  style N fill:#0D9488,color:#fff
```

---

## DIAGRAM 3 — Review Queue Flow (Slide 10)
**File to export:** `reviewqueue.png`

```mermaid
flowchart LR
  A[🤖 AI grades\nworksheet] --> B{Confidence\n≥ 0.72 on all\nquestions?}
  B -->|YES — all clear| C[✅ AUTO-ACCEPTED\nGoes to dashboard instantly]
  B -->|NO — some ambiguous| D[⚠️ REVIEW QUEUE\nGrade held back]
  D --> E[👩‍🏫 Teacher sees:\n• Tentative score\n• Flagged questions\n• AI evidence text\n• Low-conf count]
  E --> F{Teacher\ndecision}
  F -->|Approve ✓| C
  F -->|Reject ✗| G[🚫 MANUAL REVIEW\nTeacher grades by hand]
  C --> H[📊 Updates analytics\nError DNA · Heatmap · Rankings]
  G --> H

  style A fill:#1E293B,color:#14B8A6,stroke:#0D9488,stroke-width:2px
  style B fill:#F97316,color:#fff
  style C fill:#10B981,color:#fff
  style D fill:#F59E0B,color:#0F172A
  style E fill:#1E293B,color:#F1F5F9,stroke:#334155
  style F fill:#8B5CF6,color:#fff
  style G fill:#F43F5E,color:#fff
  style H fill:#0D9488,color:#fff
```

---

## DIAGRAM 4 — System Architecture (Slide 12)
**File to export:** `architecture.png`

```mermaid
flowchart TB
  subgraph FE["🖥️  Frontend — React PWA  (Vercel CDN)"]
    direction LR
    UI["React 19 + Vite\nRouter · Framer Motion\ni18n: EN / हिन्दी / मराठी"]
    SW["Service Worker\nApp-shell cache\nOffline upload queue"]
    UI <--> SW
  end

  subgraph BE["⚙️  Backend — Express 5  (Vercel Serverless)"]
    direction LR
    API["REST API\n/api/v1/grading/*\n/api/students/*"]
    MUL["Multer\nIn-memory buffers\n≤ 4 MB per file"]
    PIPE["gradingPipeline.js\ngradingSafety.js\ninterventionUtils.js"]
    API --> MUL --> PIPE
  end

  subgraph AIL["🤖  AI Layer  (AIProvider singleton)"]
    direction LR
    CL["Claude Opus 4.1\nAnthropic SDK\nPrimary"]
    GE["Gemini 2.0 Flash\nGoogle Gen AI\nFallback"]
    CL -- "fails / 429\n→ auto-fallback" --> GE
  end

  subgraph DB["🗄️  MongoDB Atlas"]
    direction LR
    S["Student\nprofiles + errorDNA\n+ riskTier"]
    SUB["Submission\nper-session results"]
    GS["GradingSession\n+ answerKey\n+ telemetry"]
    GR["GradingRun\ncost + throughput"]
  end

  FE -->|"multipart/form-data\nJSON REST"| BE
  PIPE -->|"base64 image\n+ system prompt"| AIL
  AIL -->|"graded JSON"| PIPE
  BE <-->|"Mongoose ODM"| DB
  SW -->|"offline queue\nauto-sync on reconnect"| BE

  style FE fill:#0D9488,color:#fff,stroke:#0D9488
  style BE fill:#F97316,color:#fff,stroke:#F97316
  style AIL fill:#8B5CF6,color:#fff,stroke:#8B5CF6
  style DB fill:#10B981,color:#fff,stroke:#10B981
```

---

## RENDERING TIPS
- Go to https://mermaid.live
- Paste each block, set theme to **dark**
- Export as PNG at **1400 × 900** (wide) or **900 × 700** (tall)
- In LaTeX, replace `\flowplaceholder{...}` with:
  `\includegraphics[width=\linewidth]{userflow.png}` etc.
