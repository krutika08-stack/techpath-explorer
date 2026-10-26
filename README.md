# 🧭 TechPath Explorer

> **Futuristic AI Technology Literacy & Architecture Decision Engine for Engineering Students**

TechPath Explorer helps students, hackathon builders, and early-career engineers navigate the fast-moving landscape of artificial intelligence, databases, and backend frameworks. Instead of guessing which tool fits or hitting hardware and pricing walls mid-project, TechPath Explorer matches project requirements against empirical constraints with transparent, evidence-backed trade-offs.

---

## 🚀 The Problem We Solve

Building modern software — especially agentic and AI-powered applications — presents engineering students with overwhelming choices:
* **Hidden Compute Constraints:** Selecting large models or frameworks that exceed available local RAM or require expensive cloud GPUs.
* **Pricing Surprises:** Getting locked into proprietary cloud APIs with zero free tier allowances.
* **Architecture Fatigue:** Spending hackathon sprints debugging boilerplate integrations instead of delivering core features.
* **Black-Box Hype:** Trusting generated recommendations without verifiable documentation or honest provenance.

---

## 💡 Our Solution & Key Features

TechPath Explorer provides a constraint-aware evaluation engine:
* **Constraint Matching:** Filters and ranks technologies based on team skill level, ₹0 vs. flexible budget, and hardware capacity (standard laptop CPU/RAM vs. cloud compute).
* **Explainable Shortlists:** Details why each tool matched, key operational advantages, real limitations, and verified documentation sources.
* **Strict Provenance Integrity:** Never mislabels deterministic rule-based output as AI-generated. The UI truthfully displays whether hosted cloud inference ran or deterministic heuristic fallback was applied.
* **Injection-Resilient Design:** Built-in HTML sanitization and URL validation preventing script injection from user input and dataset attributes.

---

## 🤖 Multi-Agent & Orchestration Workflow

### Planned Architecture vs. Implemented Pipeline

The architecture specifies a multi-stage agentic workflow:
1. **Project Understanding:** Ingestion and normalization of problem statement and constraints.
2. **Technology Retrieval:** Querying candidate records from researched dataset entries.
3. **Constraint Evaluation:** Heuristic scoring based on keyword overlap, hardware suitability, and budget tiers.
4. **Model-Assisted Reasoning:** Synthesizing project-specific explanations using cloud-hosted open-weight LLMs.
5. **Response Validation:** Enforcing score bounds, schema compliance, and truthful execution metadata.

### Current Implementation Status

The active backend executes via a compiled **LangGraph** (`StateGraph`) pipeline:
* **`rank` Node:** Evaluates the project brief against [backend/technology_data.json](backend/technology_data.json) using deterministic keyword overlap and constraint evaluation rules.
* **`explain` Node:** Configured to invoke open-weight models (such as `google/gemma-4-E2B-it`) via the Hugging Face router (`ChatOpenAI` compatibility endpoint) when an `HF_TOKEN` environment variable is provided.
* **Deterministic Fallback:** If `HF_TOKEN` is unset or an upstream provider error occurs, the workflow gracefully catches exceptions, falls back to deterministic rule-based justifications from the dataset, and truthfully returns `"ai_used": false`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Vanilla HTML5, Vanilla CSS3 (Slate dark-mode tokens, Inter typography), Vanilla JavaScript (ES6+, XSS-safe DOM utilities) |
| **Backend** | Python 3.11+, FastAPI, Uvicorn (ASGI server), Pydantic v2 (Data validation) |
| **AI Orchestration** | LangGraph (`StateGraph`), LangChain Core, LangChain OpenAI (HF router integration) |
| **Dataset** | Curated JSON repository ([backend/technology_data.json](backend/technology_data.json)) covering models, frameworks, platforms, and databases |
| **Deployment** | Vercel (Frontend static hosting), Render (FastAPI web service) |

---

## 📂 Project Structure

```text
techpath-explorer/
├── backend/
│   ├── main.py                 # FastAPI application, CORS, and LangGraph workflow
│   ├── requirements.txt        # Backend Python dependencies
│   └── technology_data.json    # Curated technology dataset (6 researched records)
├── frontend/
│   ├── index.html              # Responsive single-page application interface
│   ├── style.css               # Modern slate dark-theme design system
│   ├── app.js                  # Frontend state, API integration, and sanitization
│   └── vercel.json             # Fallback Vercel config for subdirectory deployments
├── docs/
│   └── architecture.md         # System architecture and API contract specification
├── tests/
│   └── test_api.py             # FastAPI contract and validation tests
├── render.yaml                 # Render Blueprint configuration for automated backend deployment
├── vercel.json                 # Vercel root deployment configuration
└── README.md                   # Project documentation
```

---

## ⚙️ Local Setup & Run Instructions

### Prerequisites
* Python 3.11+
* Modern Web Browser (Chrome, Firefox, Edge, Safari)

### 1. Run the Backend (FastAPI)

```bash
# Navigate to repository root
cd techpath-explorer

# Install Python dependencies
pip install -r backend/requirements.txt

# (Optional) Set your Hugging Face token for cloud AI reasoning:
# Windows PowerShell:
# $env:HF_TOKEN = "your_hf_token_here"
# Linux/macOS:
# export HF_TOKEN="your_hf_token_here"

# Start the development server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`. You can inspect the interactive Swagger API documentation at `http://127.0.0.1:8000/docs`.

### 2. Run the Frontend

In a separate terminal:

```bash
# Serve the frontend directory on port 5500 (whitelisted by backend CORS):
python -m http.server 5500 --directory frontend
```

Open your browser and navigate to:
**`http://127.0.0.1:5500`**

*(Alternatively, use the VS Code Live Server extension on port 5500).*

---

## 📡 API Endpoints

### 1. Health Check
* **Route:** `GET /health`
* **Purpose:** Verifies backend liveness, dataset loading, and model configuration status.
* **Sample Response (200 OK):**
  ```json
  {
    "status": "ok",
    "message": "TechPath Explorer backend is running",
    "dataset_loaded": true,
    "technology_count": 6,
    "dataset_version": "0.1.0",
    "model_configured": false
  }
  ```

### 2. Project Analysis
* **Route:** `POST /analyze`
* **Purpose:** Evaluates constraints and returns ranked recommendations with explanations and verification notes.
* **Request Body:**
  ```json
  {
    "problem_statement": "Build an AI chatbot for customer support and documentation search",
    "skill_level": "Beginner",
    "budget": "Free / ₹0",
    "hardware": "Cloud computing only"
  }
  ```
* **Sample Response (200 OK):**
  ```json
  {
    "request": {
      "problem_statement": "Build an AI chatbot for customer support and documentation search",
      "skill_level": "Beginner",
      "budget": "Free / ₹0",
      "hardware": "Cloud computing only"
    },
    "recommendations": [
      {
        "id": "hugging-face",
        "name": "Hugging Face",
        "category": "model_platform",
        "score": 67,
        "reasons": [
          "Matches project terms or technology capabilities: cloud, customer, support",
          "The dataset indicates cloud deployment is available.",
          "A free tier is listed in the dataset; check its limits."
        ],
        "warnings": [],
        "advantages": [
          "Standardized API across thousands of open models",
          "Free core repository storage and public CPU Spaces"
        ],
        "limitations": [
          "Varying model quality across community uploads",
          "Paid compute required for heavy GPU workloads"
        ],
        "pricing": {
          "model": "free_tier_plus_paid",
          "budget_tier": "free",
          "paid_starting_from": 9.0
        },
        "sources": [
          {
            "label": "Hugging Face Docs & Pricing",
            "url": "https://huggingface.co/docs"
          }
        ],
        "verification": {
          "overall_notes": "Verified Pro subscription pricing ($9/mo), free tier limits ($0.10/mo credit), and mixed licensing model against official documentation."
        }
      }
    ],
    "dataset_version": "0.1.0",
    "ai_used": false
  }
  ```

---

## 🌐 Deployment Configuration & Live Targets

| Component | Platform | Configuration File | Configured Target URL | Deployment Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | [vercel.json](vercel.json) | `https://tech-path-explorer.vercel.app` | Ready to build on push to `main` |
| **Backend** | Render | [render.yaml](render.yaml) | `https://techpath-explorer-backend.onrender.com` | Blueprint ready for deployment |

> [!NOTE]
> Production deployment links are activated upon pushing `main` to GitHub and completing platform service instantiation.

---

## 📋 Current Implementation Status & Known Limitations

* **Dataset Scale:** The dataset contains 6 empirically curated technologies (Google Gemma 4, Meta Llama 4 Scout, Hugging Face, LangChain, FastAPI, PostgreSQL). Additional tools require entry in [backend/technology_data.json](backend/technology_data.json).
* **Model Connectivity:** Cloud model reasoning requires an active Hugging Face token (`HF_TOKEN`) and network connectivity to `https://router.huggingface.co/v1`. If unconfigured, the system automatically falls back to deterministic rule matching.
* **CORS Whitelist:** Local origins `http://127.0.0.1:5500`, `http://localhost:5500`, `http://127.0.0.1:3000`, and `http://localhost:3000` are permitted by default. Production origins are configured via the `FRONTEND_ORIGINS` environment variable (set to `*` in [render.yaml](render.yaml)).

---

## 👥 Team & Contributions

* **Krutika Patole** ([@krutika08-stack](https://github.com/krutika08-stack)) — Project Lead & Full Stack Architecture
* *Additional Contributors / Team Members* — [Add team member names and GitHub handles here]

---

## 📄 License

This repository does not currently contain a separate standalone open-source license file. An open-source license (such as MIT) may be added by the repository owner.
