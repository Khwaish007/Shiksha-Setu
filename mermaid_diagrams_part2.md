# Mermaid Diagrams — Part 2
**Shiksha Setu | Wadhwani AI Hackathon | Phase 2 Slides 14–28**

Export each diagram from **https://mermaid.live**  
Settings: Theme → **dark** | Background → `#0F172A` | Export → PNG at **1400 × 900 px**

Save to: `frontend/public/figures/` (same folder as part 1 diagrams)

---

## Diagram 1: Full System Data Flow
**File to save:** `figures/full-system-flow.png`  
**Used on:** Slide 27 (Appendix B)  
**Page treatment:** Full page — export at 1600 × 900 px

```mermaid
flowchart LR
    subgraph Teacher["📱 Teacher (PWA)"]
        T1([Upload Photos])
        T2([Set Answer Key])
        T3([Review Queue])
        T4([View Dashboard])
    end

    subgraph API["⚙️ Express API — Vercel Serverless"]
        A1[/Multer in-memory\]
        A2[Image Validator]
        A3[Batch Splitter\n5 sheets/batch]
        A4[Session Manager\nUUID-scoped]
    end

    subgraph AI["🤖 AI Layer"]
        direction TB
        C1["Claude Opus 4.1\nPrimary"]
        G1["Gemini 2.0 Flash\nFallback"]
        M1["Manual Review\nSafety Net"]
        C1 -->|"fail / rate-limit\n3x backoff"| G1
        G1 -->|both fail| M1
    end

    subgraph Safety["🛡️ Safety Gates"]
        S1{Confidence\n≥ 0.72?}
        S2[Schema\nValidation]
        S3[Score\nClamp 0–100]
    end

    subgraph DB["🗄️ MongoDB Atlas"]
        D1[(GradingSession)]
        D2[(Submission)]
        D3[(Student)]
        D4[(GradingRun)]
    end

    subgraph Output["📊 Outputs"]
        O1[Class Heatmap]
        O2[Error DNA]
        O3[At-Risk Alerts]
        O4[Parent WhatsApp]
    end

    T1 --> A1
    T2 --> A4
    A1 --> A2
    A2 -->|valid| A3
    A2 -->|invalid| M1
    A3 --> C1
    A4 --> C1
    C1 --> S2
    G1 --> S2
    S2 --> S1
    S1 -->|yes| S3
    S1 -->|no| T3
    S3 --> D1
    S3 --> D2
    D2 --> D3
    D1 --> D4
    D3 --> O1
    D3 --> O2
    O2 --> O3
    O3 --> O4
    O1 --> T4
    O2 --> T4
    O3 --> T4
```

---

## Diagram 2: Pilot Rollout Flow
**File to save:** `figures/pilot-rollout.png`  
**Used on:** Slide 28 (Appendix C)  
**Page treatment:** Full page — export at 1400 × 900 px

```mermaid
flowchart TD
    A([School Identified]) --> B[Champion Teacher\nOnboarded]
    B --> C[2-Hour WhatsApp\nWorkshop — Hindi Video]
    C --> D[2-Week Free Trial\nFull Features]
    D --> E{NPS ≥ 8 &\n≥80% retention?}

    E -->|Yes ✓| F[School Subscribes\nRs. 5/student/month]
    E -->|No ✗| G[Support Call\nIssue Resolution]
    G --> H{Resolved?}
    H -->|Yes| D
    H -->|No| I[Exit — Data\nReturned to School]

    F --> J[Block Education\nOfficer Briefed]
    J --> K{Recommends to\n10–20 schools?}
    K -->|Yes| L[Block-Level\nRollout]
    K -->|No| M[Referral Programme\nChampion recruits peer]
    M --> B

    L --> N[State EdTech Portal\nIntegration — DigiShiksha]
    N --> O([10,000 Teachers\nJan 2027])

    style A fill:#0D9488,color:#fff
    style O fill:#10B981,color:#fff
    style E fill:#1E293B,color:#F1F5F9
    style H fill:#1E293B,color:#F1F5F9
    style K fill:#1E293B,color:#F1F5F9
    style I fill:#F43F5E,color:#fff
    style F fill:#10B981,color:#fff
    style L fill:#8B5CF6,color:#fff
    style N fill:#F97316,color:#fff
```

---

## Diagram 3: Phase 2 AI Evaluation Flow
**File to save:** `figures/eval-flow.png`  
**Used on:** Slide 15–16 reference (optional insert)  
**Page treatment:** Full page — export at 1400 × 900 px

```mermaid
flowchart LR
    subgraph TestSet["📋 Test Set — 120 Worksheets"]
        TS1["9 Concepts\nAlgebra, Trig,\nCalculus, etc."]
        TS2["3 Difficulty\nLevels"]
        TS3["3 Script Types\nEN / HI / Mixed"]
        TS4["2 Image\nQuality Tiers\nClean / Degraded"]
    end

    subgraph Grading["🤖 AI Grading"]
        G1[Claude Opus 4.1]
        G2[Schema Validation]
        G3[Confidence Gate\n0.72 threshold]
    end

    subgraph Gold["👩‍🏫 Gold Standard"]
        GS1[Teacher A\nGrades]
        GS2[Teacher B\nGrades]
        GS3{Disagree?}
        GS4[Teacher C\nResolves]
    end

    subgraph Metrics["📊 Metrics"]
        M1["Score MAE\n6.2 pts ✓"]
        M2["Concept F1\n0.83 ✓"]
        M3["Review Rate\n3.8% ✓"]
        M4["ECE\n0.08 ✓"]
    end

    TS1 & TS2 & TS3 & TS4 --> G1
    G1 --> G2 --> G3
    G3 --> GS1 & GS2
    GS1 & GS2 --> GS3
    GS3 -->|Yes| GS4
    GS3 -->|No| M1
    GS4 --> M1
    G3 --> M2 & M3 & M4

    style M1 fill:#10B981,color:#fff
    style M2 fill:#10B981,color:#fff
    style M3 fill:#10B981,color:#fff
    style M4 fill:#10B981,color:#fff
```

---

## Diagram 4: Deployment Architecture (Detailed)
**File to save:** `figures/deployment-arch.png`  
**Used on:** Slide 21 (Deployment & Sustainability) — optional insert  
**Page treatment:** Full page — export at 1600 × 1000 px

```mermaid
flowchart TB
    subgraph Client["📱 Client Layer"]
        C1["React 19 + Vite\nPWA"]
        C2["Service Worker\nOffline Cache"]
        C3["IndexedDB\nOffline Upload Queue"]
        C1 <--> C2
        C1 <--> C3
    end

    subgraph CDN["🌐 Vercel Edge CDN"]
        E1["Static Assets\nReact SPA"]
        E2["Practice PDFs\n9 topics served"]
    end

    subgraph Serverless["⚙️ Vercel Serverless — Express 5"]
        S1["/api/grade\nBatch grading"]
        S2["/api/students\nStudent CRUD"]
        S3["/api/session\nSession management"]
        S4["/api/analytics\nDashboard data"]
        S5["Multer\nIn-memory buffer"]
        S1 --> S5
    end

    subgraph AIL["🤖 AI Layer"]
        A1["Anthropic SDK\nClaude Opus 4.1"]
        A2["Google GenAI\nGemini 2.0 Flash"]
        A3["Exponential\nBackoff 3x"]
        A1 -->|rate-limit / fail| A3
        A3 --> A2
    end

    subgraph Database["🗄️ MongoDB Atlas — M10"]
        D1[(Student)]
        D2[(Submission)]
        D3[(GradingSession)]
        D4[(GradingRun)]
        D5[(Telemetry)]
    end

    C1 <-->|HTTPS| CDN
    C1 <-->|REST API| Serverless
    C3 -->|sync on reconnect| S1
    S1 <--> AIL
    S2 <--> D1
    S1 --> D2 & D3 & D4
    S4 --> D1 & D2 & D3
    S3 --> D3
    S1 --> D5

    style C1 fill:#0D9488,color:#fff
    style A1 fill:#8B5CF6,color:#fff
    style A2 fill:#F97316,color:#fff
    style Database fill:#1E293B,color:#F1F5F9
```

---

## Export Instructions

| Diagram | File | Slide | Size |
|---------|------|-------|------|
| Full System Data Flow | `figures/full-system-flow.png` | 27 | 1600×900 |
| Pilot Rollout Flow | `figures/pilot-rollout.png` | 28 | 1400×900 |
| AI Evaluation Flow | `figures/eval-flow.png` | 15–16 (optional) | 1400×900 |
| Deployment Architecture | `figures/deployment-arch.png` | 21 (optional) | 1600×1000 |

### Steps
1. Open [https://mermaid.live](https://mermaid.live)
2. Paste the code block for the diagram you want
3. Click **Config** tab → set `theme: dark`
4. Click **Actions → PNG** → save at the size noted above
5. Place PNG in `frontend/public/figures/` alongside part 1 diagrams
6. Replace `[ Insert Mermaid diagram: X ]` placeholder in the `.tex` file with:
   ```latex
   \includegraphics[width=0.96\linewidth,height=0.70\textheight,keepaspectratio]{figures/FILENAME.png}
   ```
