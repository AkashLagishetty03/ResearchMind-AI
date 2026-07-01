# ResearchMind AI - Multi-Agent Research & Decision Intelligence Platform

ResearchMind AI is a state-of-the-art multi-agent platform designed to execute complex research tasks, debate hypotheses, verify claims, and compile executive-grade decision intelligence reports. Powered by a concurrent state-graph engine built on LangGraph and FastAPI, the system manages parallel agent execution, tracks logical consistency, and computes detailed certainty analytics.

---

## 🛠️ Tech Stack & Architecture

### Backend
* **Core Engine**: Python 3.12, LangGraph (StateGraph-based workflow orchestration)
* **Framework**: FastAPI (Asynchronous endpoints and Server-Sent Events (SSE) real-time streaming)
* **LLM Integration**: OpenRouter API with dynamic model configurations, retries, and automatic fallback recovery
* **Database**: SQLite (SQLAlchemy 2.0 with async engine)
* **Testing**: Pytest & Pytest-Asyncio

### Frontend
* **Core**: React 18, TypeScript, Vite
* **Styling**: Vanilla CSS, Glassmorphism gradients, custom HSL color palette
* **Icons**: Lucide React
* **Document Export**: PDF export powered by `html2pdf.js`

---

## 🚀 Setup & Execution

### Prerequisites
* Python 3.12+
* Node.js 18+

### 1. Backend Installation & Start
From the project root:

1. **Activate Virtual Environment**:
   ```bash
   venv\Scripts\activate
   ```
2. **Install Dependencies** (if needed):
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory (use `.env.example` as a template):
   ```env
   OPENROUTER_API_KEY=your_openrouter_key_here
   DATABASE_URL=sqlite+aiosqlite:///./researchmind.db
   APP_NAME="ResearchMind AI"
   FRONTEND_URL=http://localhost:5173
   ```
4. **Run Server**:
   ```bash
   cd backend
   python run.py
   ```
   The backend API will start at `http://localhost:8000`. Database tables and default configurations will seed automatically on startup.

### 2. Frontend Installation & Start
From the project root in a new terminal:

1. **Navigate and Install Packages**:
   ```bash
   cd frontend
   npm install
   ```
2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   The application UI will start at `http://localhost:5173`.

---

## 🧪 Running Automated Tests

To execute the test suite covering concurrent agent execution, state merging, and debate ordering:

```bash
cd backend
..\venv\Scripts\python.exe -m pytest -v tests/
```

---

## 📚 Core Architecture Documents

* **State Merging Design**: See [ARCHITECTURE.md](file:///c:/Users/aakas/OneDrive/Documents/Desktop/ResearchMind%20AI/ARCHITECTURE.md) to understand how LangGraph uses `Annotated` schemas and `operator.add` reducers to execute agents concurrently and merge outputs safely.
* **Agent Settings & Control**: Access the **Agent Control Panel** in the UI to dynamically adjust models, temperatures, fallback paths, and tokens.
