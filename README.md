<div align="center">
<img src="https://via.placeholder.com/800x400/1a1a2e/ffffff?text=HetGPT+Screenshot" alt="HetGPT Banner" width="100%" />

# 👽 HetGPT

### *A Multi-Model AI Assistant*


![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB)&nbsp;&nbsp;&nbsp;
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688)&nbsp;&nbsp;&nbsp;
![Next.js](https://img.shields.io/badge/Next.js-16-000000)&nbsp;&nbsp;&nbsp;
![LangChain](https://img.shields.io/badge/LangChain-0.1%2B-1C3C3C)&nbsp;&nbsp;&nbsp;
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-336791)&nbsp;&nbsp;&nbsp;
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)


<p align="center">
  <strong>Smart Query Routing • Long-Term Memory • Real-Time Tools • Custom Fine-Tuned Models</strong>
</p>

[Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage) • [API Reference](#-api-reference) • [Contributing](#-contributing)

---

</div>

## 🌟 Overview

**HetGPT** is not another ChatGPT wrapper. It's a purpose-built AI assistant featuring a **multi-model architecture** that intelligently routes queries to specialized models. With **persistent long-term memory**, **real-time tool integration**, and a **custom fine-tuned Computer Science model**, HetGPT delivers expert-level responses tailored to your needs.


---

## ✨ Features

### 🧠 Intelligent Multi-Model Routing
- **Query Router**: Analyzes user intent and directs queries to the optimal model
- **CS Specialist Model**: Fine-tuned Llama 3.1 8B using QLoRA on Computer Science datasets
- **General Model**: Handles conversational queries and ambiguous requests

### 🔧 Real-Time Tool Integration
| Tool | Description |
|------|-------------|
| 🔍 **Web Search** | Real-time information via DuckDuckGo |
| 📚 **Wikipedia** | Static knowledge retrieval |
| 🌤️ **Weather** | Live weather data via APIs |
| 📰 **News** | Current news updates |

### 🧠 Dual-Layer Memory System
- **Short-Term Memory**: Tracks current conversation context
- **Long-Term Memory (LTM)**: 
  - Summarizes and stores conversation insights
  - FAISS vector store with `all-MiniLM-L6-v2` embeddings
  - Retrieves relevant past interactions for personalized responses

### 📄 Document RAG (Retrieval-Augmented Generation)
- Upload PDFs for session-specific Q&A
- On-the-fly document processing and embedding
- Supports both Pinecone and FAISS(for LTM context) vector stores

### 🎨 Modern Frontend
- Built with **Next.js 16** 
- Glassmorphism UI design with dark mode
- Streaming responses with real-time tool indicators
- Fully responsive design

---

## 🏗 Architecture

```
HetGPT/
├── 🔌 api/                    # FastAPI Backend
│   ├── main.py               # Main application & endpoints
│   ├── auth.py               # JWT authentication
│   ├── database.py           # PostgreSQL connection
│   ├── model.py              # SQLAlchemy models
│   └── schema.py             # Pydantic schemas
│
├── 🧠 LLM/                    # Model Ecosystem
│   ├── cs_model.py           # Fine-tuned CS specialist
│   ├── general_model.py      # General conversation model
│   └── summary_model.py      # Conversation summarizer
│
├── 🔀 query_router/           # Intent Classification
│   └── route.py              # Query routing logic
│
├── 📚 RAG/                    # Memory & Retrieval
│   ├── long_term_RAG.py      # Long-term memory retrieval
│   ├── session_vectordb.py   # Session-based document store
│   └── vector_db.py          # Vector database utilities
│
├── 🛠 Tools/                   # External Integrations
│   ├── tools.py              # Tool definitions
│   └── tool_routing.py       # Tool execution logic
│
├── 💻 frontend/               # Next.js Frontend
│   ├── app/
│   │   ├── components/       # React components
│   │   ├── context/          # Auth context
│   │   ├── chat/             # Chat interface
│   │   └── layout.tsx        # Root layout
│   └── public/               # Static assets
│
├── 🐳 Dockerfile              # Backend container
├── 🐳 docker-compose.yml      # Full stack orchestration
└── 📋 requirements.txt        # Python dependencies
```

---

## 🚀 Installation

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** (or use Neon cloud database)
- **Docker** (optional, for containerized deployment)

### Option 1: Local Development

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/hetbhalani/HetGPT.git
cd HetGPT
```

#### 2️⃣ Backend Setup
```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and database URL
```

#### 3️⃣ Frontend Setup
```bash
cd frontend
npm install
```

#### 4️⃣ Start the Application
```bash
# Terminal 1: Start Backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### Option 2: Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## ⚙️ Configuration

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/xyz

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# LLM Providers
GOOGLE_API_KEY=your-google-api-key
HF_TOKEN=your-huggingface-token

# Vector Stores
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=hetgpt-memory

# Optional: Ollama (for local models)
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 📖 Usage

### Web Interface

1. Open `http://localhost:3000` in your browser
2. Create an account or log in
3. Start chatting with HetGPT!

### Example Queries

| Query Type | Example |
|------------|---------|
| 🎓 **CS/Coding** | "Explain the time complexity of quicksort and implement it in Python" |
| 💬 **General** | "What's a good recipe for pasta?" |
| 🔍 **Web Search** | "What are the latest developments in AI?" |
| 📄 **Document Q&A** | Upload a PDF and ask "Summarize the key points of this document" |

---

## 📡 API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create new user account |
| `/auth/login` | POST | Login and receive JWT token |
| `/auth/me` | GET | Get current user info |
| `/auth/logout` | POST | Logout and clear session |

### Chat

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Send message and get AI response |
| `/chat/stream` | POST | Streaming chat response |
| `/chat/new` | POST | Start new conversation |

### Documents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload PDF for RAG |
| `/documents` | GET | List uploaded documents |

---

## 🔬 Technical Deep Dive

### Custom CS Model

The specialist model is fine-tuned using:
- **Base Model**: Llama 3.1 8B
- **Method**: QLoRA (Quantized Low-Rank Adaptation)
- **Dataset**: Curated Computer Science Q&A pairs
- **Focus Areas**: Algorithms, Data Structures, System Design, Code Generation

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 |
| **Backend** | FastAPI, SQLAlchemy, Pydantic |
| **Database** | PostgreSQL (Neon) |
| **Vector Store** | FAISS, Pinecone |
| **LLM Framework** | LangChain |
| **Embeddings** | HuggingFace (all-MiniLM-L6-v2) |
| **Auth** | JWT (HTTP-only cookies) |
| **Deployment** | Docker|

---

## 🎯 Key Differentiators

| Feature | HetGPT | Standard Wrappers |
|---------|--------|-------------------|
| Multi-Model Routing | ✅ | ❌ |
| Custom Fine-Tuned Model | ✅ | ❌ |
| Long-Term Memory | ✅ | ❌ |
| Real-Time Tools | ✅ | Limited |
| Document RAG | ✅ | ✅ |
| Open Source | ✅ | Varies |

---


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## � Let's Connect

I'm always open to discussing projects, ideas, or collaborations. You can reach me here:

- 💼 [LinkedIn](https://linkedin.com/in/hetbhalani)
- 🐦 [Twitter/X](https://twitter.com/hetbhalani)
- 🤗 [HuggingFace](https://huggingface.co/hetbhalani)
- 📧 [bhalanihet2006@gmail.com](mailto:bhalanihet2006@gmail.com)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by **Het Bhalani** 👽

</div>
