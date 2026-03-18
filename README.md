<div align="center">
  <img src="https://github.com/hetbhalani/HetGPT/blob/deployment/frontend/public/header.png" alt="HetGPT Banner" width="100%" />

# HetGPT 👽



![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688)
![Next.js](https://img.shields.io/badge/Next.js-16-000000)
![LangChain](https://img.shields.io/badge/LangChain-0.1%2B-1C3C3C)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-336791)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

Long-Term + Short-Term Memory • Document RAG • Tool-Augmented Responses • Custom CS Model

[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [Quick Start](#quick-start) • [Configuration](#configuration) • [API](#api-reference) • [Contributing](#contributing)

</div>

## Overview

HetGPT is a full-stack AI assistant focused on persistent memory, retrieval quality, and practical tool usage. It combines short-term conversation context, long-term memory summarization, document RAG, and a custom fine-tuned computer science model.

Query routing is used as a supporting layer, while the primary value comes from context retention, grounded retrieval, and tool-augmented responses for more accurate and personalized interactions.

## Features

- Dual memory system with short-term session context and long-term memory summaries
- Document RAG with PDF upload, chunking, embedding, and vector retrieval
- Tool integrations for web search, reference lookup, weather, and news
- Custom fine-tuned CS model (Qwen 3 8B + QLoRA)
- Multi-model backend with intent-aware routing as a support layer
- Device-based daily rate limiting
- Modern Next.js interface with streaming-style chat UX

## Architecture

```text
HetGPT/
|- api/                  # FastAPI service (auth, chat, upload, rate limiting)
|- LLM/                  # Model calls (general, CS specialist, summarizer)
|- query_router/         # Intent routing and session coordination
|- RAG/                  # Long-term memory and document vector stores
|- Tools/                # External tool definitions and routing
|- frontend/             # Next.js web application
|- docker-compose.yml    # Full-stack local orchestration
`- Dockerfile            # Backend container image
```

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, TypeScript |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Data | PostgreSQL (Neon-compatible) |
| Vector DB | Pinecone, FAISS |
| LLM Orchestration | LangChain |
| Embeddings | all-MiniLM-L6-v2 |
| Auth | JWT via secure HTTP-only cookies |
| Deployment | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Access to a PostgreSQL database
- API keys for the providers you plan to use

### 1. Clone

```bash
git clone https://github.com/hetbhalani/HetGPT.git
cd HetGPT
```

### 2. Backend Setup

```bash
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 4. Configure Environment Variables

Create a `.env` file at the project root and add the required values.

### 5. Run Locally

```bash
# Terminal 1 (backend)
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 (frontend)
cd frontend
npm run dev
```

Application URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Docker Deployment

```bash
docker-compose up -d --build
docker-compose logs -f
docker-compose down
```

## Configuration

Use a root `.env` file similar to the following:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication
JWT_SECRET=replace-with-a-strong-secret

# LLM Providers
GOOGLE_API_KEY=your-google-key
HF_TOKEN=your-huggingface-token

# Vector Store
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=hetgpt-memory

# Optional local model runtime
OLLAMA_BASE_URL=http://localhost:11434
```

## API Reference

### Core

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check |
| `/chat` | POST | Main query-response endpoint |
| `/chat/init` | POST | Initialize session with long-term memory |
| `/chat/end-session` | POST | Trigger background summarization |
| `/upload` | POST | Upload a document for session retrieval |

### Authentication

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/signup` | POST | Register user |
| `/auth/login` | POST | Authenticate user |
| `/auth/me` | GET | Return authenticated user profile |
| `/auth/logout` | POST | Clear auth cookie |

### Limits and User Data

| Endpoint | Method | Purpose |
|---|---|---|
| `/rate-limit/check` | POST | Check device-level quota |
| `/users` | GET | List users |
| `/users/{user_id}` | GET | Get user by ID |
| `/users/{user_id}` | DELETE | Delete user |
| `/users/{user_id}/context` | PUT | Update long-term context |

## Model Notes

The CS specialist path is based on a fine-tuned Qwen 3 8B model using QLoRA on curated programming and computer science datasets. The query router decides when to use this specialist path versus the general model path.

## Roadmap

- ✅ Device-based rate limiting with daily quota tracking
- ✅ Long-term memory summarization and recall
- ⬜ Voice interaction support
- ⬜ Stronger agentic memory and retrieval quality
- ⬜ Multi-step tool chaining workflows
- ⬜ Expanded observability and evaluation benchmarks

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit focused changes with clear messages
4. Open a pull request describing motivation and impact

## License

This project is licensed under MIT. See [LICENSE](LICENSE) for details.

## Contact

- LinkedIn: https://linkedin.com/in/hetbhalani
- Twitter/X: https://twitter.com/hetbhalani
- Hugging Face: https://huggingface.co/hetbhalani
- Email: bhalanihet2006@gmail.com
