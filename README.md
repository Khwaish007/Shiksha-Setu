# Shiksha-Setu

AI-powered classroom grading and learning-gap intelligence for Indian math classrooms.

Shiksha-Setu helps a teacher upload handwritten mathematics worksheets, grade them with Claude, identify concept-level mistakes, route uncertain cases to teacher review, and generate classroom-level analytics, intervention plans, and parent communication.

## What This Prototype Does

- Grades handwritten math worksheets using Anthropic Claude vision.
- Lets teachers define the ground truth with a typed answer key or an uploaded model worksheet.
- Rejects garbage, unreadable, non-math, or unsupported files with a manual-review flow.
- Routes low-confidence grades into a human-in-the-loop Review Queue.
- Shows dashboard analytics: overview, score distribution, heatmap, misconceptions, recommendations, at-risk students, rankings, strengths, peer comparison, and class insights.
- Tracks individual student profiles with test history, recurring mistakes, Error DNA, practice PDFs, and parent messaging.
- Supports English, Hindi, and Marathi UI.
- Includes offline/PWA capture queue and upload data-cost estimates for low-bandwidth classrooms.
- Includes an Accuracy Report benchmark for score MAE, concept precision/recall, and review rates.
- Includes cost and throughput telemetry plus a pilot-readiness plan.

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Framer Motion
- Vanilla CSS
- PWA service worker and IndexedDB offline queue

### Backend

- Node.js
- Express
- MongoDB Atlas with Mongoose
- Anthropic SDK
- Multer for image uploads
- Vercel serverless deployment support

## Repository Structure

```text
Shiksha-Setu/
  backend/
    api/index.js
    src/
      controllers/
      models/
      routes/
      utils/
      benchmark/
  frontend/
    public/
    src/
      api/
      components/
      styles/
      utils/
  student_tests_dataset/
  student_tests_dataset_2/
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB Atlas connection string
- Anthropic API key

Optional:

- Python 3 if you want to regenerate demo datasets or practice PDFs

## Environment Variables

### Backend

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
ANTHROPIC_API_KEY=sk-ant-your-key-here
FRONTEND_URL=http://localhost:5173

# Optional tuning
PORT=5000
UPLOAD_BATCH_SIZE=10
CLAUDE_BATCH_SIZE=2
CLAUDE_BATCH_DELAY_MS=1000
```

### Frontend

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

For production, set `VITE_API_BASE_URL` to your deployed backend URL.

## Local Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Run Backend

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 3. Install Frontend Dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

### 4. Run Frontend

```bash
npm run dev
```

Frontend usually runs on:

```text
http://localhost:5173
```

## Main Demo Flow

1. Open the frontend.
2. A fresh grading session is created automatically.
3. Go to `Upload Tests`.
4. Add an answer key:
   - Type answers like `Q1: x = 4`, or
   - Upload a filled model worksheet.
5. Upload handwritten math worksheet images.
6. Click `Process Selected Worksheets`.
7. Close the result popup.
8. Open `Dashboard`.
9. Review:
   - Overview
   - Review Queue
   - Accuracy Report
   - Heatmap
   - Misconceptions
   - Recommendations
   - At-Risk
   - Rankings
   - Strengths
   - Peer Compare
   - Pilot Readiness
10. Open `Students` to test student profiles, individual uploads, parent messages, and intervention plans.

## Important Behavior

### Manual Review

The backend does not force-grade invalid inputs. These are routed to `Manual Review Required`:

- Blank image
- Corrupted image
- Unsupported file type
- Non-math worksheet
- Garbage upload
- Unreadable handwriting
- Insufficient visible student work

### Teacher Review Queue

Readable worksheets with low-confidence question judgments are routed to:

```text
Needs Teacher Review
```

They do not enter analytics until the teacher approves them from the Review Queue.

### Answer Key Ground Truth

If an answer key exists for the session, Claude grades against that key. This prevents the AI from guessing a different marking scheme.

## Accuracy Report

The prototype includes a benchmark harness.

Benchmark labels live in:

```text
backend/src/benchmark/benchmarkCases.json
```

Benchmark assets live in:

```text
backend/src/benchmark/assets/
```

The Accuracy Report measures:

- Score MAE
- Concept precision
- Concept recall
- Manual-review rate
- Teacher-review rate

### Run From UI

Open:

```text
Dashboard -> Accuracy Report
```

On Vercel, the live benchmark runs one Claude case per click because serverless functions can time out on multiple image grading calls.

### Run Full Benchmark Locally

From `backend`:

```bash
npm run benchmark:accuracy
```

For UI-only testing without Claude:

```bash
npm run benchmark:accuracy -- --mode=mock
```

## Offline/PWA Test

1. Start the app.
2. Open `Upload Tests`.
3. Select worksheet images.
4. Turn off network in browser DevTools.
5. Click upload. The app saves worksheets to the offline queue.
6. Turn network back on.
7. The queued worksheets sync automatically.

## Vercel Deployment

This project can be deployed as separate frontend and backend Vercel projects.

### Backend Vercel Variables

Set these in the backend Vercel project:

```env
MONGO_URI=your_mongodb_connection_string
ANTHROPIC_API_KEY=your_anthropic_api_key
FRONTEND_URL=https://your-frontend-url.vercel.app
```

The backend `vercel.json` includes:

```json
"includeFiles": "src/benchmark/**"
```

This is required so Vercel bundles the benchmark images and answer keys.

### Frontend Vercel Variables

Set this in the frontend Vercel project:

```env
VITE_API_BASE_URL=https://your-backend-url.vercel.app
```

After changing frontend environment variables, redeploy the frontend.

## Useful Commands

### Backend

```bash
cd backend
npm run dev
npm start
npm run benchmark:accuracy
```

### Frontend

```bash
cd frontend
npm run dev
npm run lint
npm run build
npm run preview
```

## Verification Checklist

Before submitting:

- Backend starts without errors.
- Frontend starts without errors.
- `npm run lint` passes in `frontend`.
- `npm run build` passes in `frontend`.
- Uploading a normal worksheet grades successfully.
- Uploading garbage creates a manual-review popup.
- Low-confidence output appears in Review Queue.
- Accuracy Report shows `12/12 benchmark cases available`.
- Student profile upload works.
- Session history can resume older sessions.

## Known Demo Notes

- Full 12-case live accuracy benchmarking should be run locally through the backend CLI, not in one Vercel request.
- The deployed UI uses one live benchmark case per click to avoid serverless timeouts.
- Benchmark labels should be manually verified before making final accuracy claims.

## Submission Summary

Shiksha-Setu turns handwritten math tests into timely feedback. It gives teachers answer-key-controlled grading, safe manual-review handling, confidence-based human review, classroom heatmaps, intervention planning, parent communication, multilingual UI, offline resilience, and measurable accuracy reporting.
