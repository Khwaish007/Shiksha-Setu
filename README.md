# Shiksha-Setu (Educational Bridge)

Shiksha-Setu is an AI-powered Classroom Intelligence Suite and Batch Grading prototype built for modern educational environments. It empowers teachers to quickly diagnose student-level learning gaps and provide timely, actionable feedback in large, mixed-ability classrooms, drastically reducing manual teacher burden.

---

## 🚀 Key Features

### 1. AI-Powered Batch Grading & OCR
*   **Multimodal Handwriting Analysis**: Utilizes **Claude 3.5 Sonnet** (via the Anthropic SDK with robust error handling and exponential backoff retry mechanisms) to perform optical character recognition (OCR) on handwritten student quizzes and worksheets.
*   **Automatic Concept Mapping**: Not only grades quizzes out of 100 points but matches student errors to a predefined taxonomic database of mathematical concepts (e.g., *Linear Equations*, *Calculus Differentiation*, *Trigonometry*, *Probability*).
*   **Automated Data Upserts**: Integrates a seamless dual-write storage architecture to MongoDB Atlas, updating unique student records and test history, while keeping clean aggregated submission states.

### 2. High-Fidelity Classroom Intelligence Dashboard
*   **Cohort Overview**: Key metrics such as overall student registration count, class average score, maximum score, and class excellence rates.
*   **Performance Distribution**: Analyzes the statistical distribution of student scores, determining whether the class is following a Normal, Skewed, or polarized Bimodal distribution.
*   **Conceptual Heatmap**: Maps out conceptual failures across the class dynamically. High-intensity cells draw visual focus directly onto topics where the majority of students are failing.
*   **Topics & Recommendations Panel**: Classifies topics requiring instruction (Very High to Low priority) and couples them with concrete recommendations (e.g. "Urgent: Consider re-teaching with examples").
*   **Student Rankings**: Real-time leaderboards that sort cohort performance, grading logs, and mistake frequency.

### 3. Individual Student Diagnosis & Remediation
*   **Vital Signs Profile**: Circle-based score visualization, historical test enrollment tracking, and performance trajectory lines (increasing/declining compared to prior tests).
*   **Struggle Cloud**: Dynamic tag cloud that spotlights the top recurring gaps for a given student across their academic timeline.
*   **Targeted Remediation Sheets**: Links student struggle points directly to downloadable, specialized PDF practice tests that target the exact concept they missed.
*   **Peer Benchmarking**: Places student scores side-by-side with class percentiles and group-learning recommendations (study circles with peers matching similar conceptual gaps).

---

## 🛠️ Architecture & Tech Stack

### Frontend
*   **Core**: React (Vite-powered, ES Modules)
*   **Routing**: React Router DOM (v6) for seamless view changes between dashboard tabs and student profile views.
*   **Animation**: Framer Motion for premium micro-animations, fade-ins, and expander dropdown panels.
*   **Styling**: Vanilla CSS custom themes configured with fluid dark-mode glassmorphic aesthetics.

### Backend
*   **Runtime**: Node.js & Express
*   **Database**: MongoDB (via Mongoose schemas for `Student` profiles and `Submission` documents)
*   **AI Integration**: `@anthropic-ai/sdk` for image analysis (Claude 3.5) with batch-rate throttling.
*   **File Upload**: Multer (configured for in-memory stream buffers for fast grading response times).

### Data Scripts
*   `generate_practice_tests.py`: Python reportlab-driven generator that outputs customized concept practice tests.
*   `generate_dataset.py`: Populates mock students and quiz outcomes to seed the MongoDB Atlas cluster for instant demo readiness.

---

## 🏁 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python 3.8+ (for generating supplementary PDFs)
*   MongoDB Atlas connection string
*   Anthropic API Key (set in `.env`)

### Setup Instructions

1. **Clone the Repository** and navigate to the project directory:
   ```bash
   cd Shiksha-Setu
   ```

2. **Backend Configuration**:
   * Create a `.env` file inside the `backend/` folder:
     ```env
     PORT=5000
     MONGO_URI=your_mongodb_connection_string
     ANTHROPIC_API_KEY=your_anthropic_api_key
     CLAUDE_BATCH_SIZE=5
     CLAUDE_BATCH_DELAY_MS=1000
     ```
   * Install dependencies and run the server:
     ```bash
     cd backend
     npm install
     npm start
     ```

3. **Frontend Configuration**:
   * Install dependencies and start the Vite dev server:
     ```bash
     cd ../frontend
     npm install
     npm run dev
     ```

4. **Generating Mock Datasets & PDF Practice Sheets** (Optional):
   * Run the python scripts from the root directory:
     ```bash
     pip install reportlab
     python generate_practice_tests.py
     python generate_dataset.py
     ```