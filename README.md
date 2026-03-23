# Project 01 - Sentiment Analysis Dashboard

Microservice Architecture: React + FastAPI Backend + FastAPI NLP Service

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  (React - Port 3000)                              │
│  axios POST /api/v1/predict                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP JSON
                       │ (user facing)
┌──────────────────────▼──────────────────────────────────────┐
│  BACKEND  (FastAPI - Port 8000)                             │
│  Receives request from frontend                             │
│  httpx POST /api/v1/nlp/predict  →  calls nlp-service       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP JSON
                       │ (internal only)
┌──────────────────────▼──────────────────────────────────────┐
│  NLP SERVICE  (FastAPI - Port 8001)                         │
│  Loads model.pkl                                            │
│  Cleans text → TF-IDF → LogisticRegression                  │
│  Returns { label, sentiment, confidence }                   │
└─────────────────────────────────────────────────────────────┘
```

## Why Microservices

| Benefit | How |
|---------|-----|
| Independent deployment | Each service has its own Docker image |
| Independent scaling | Scale nlp-service only when needed |
| Independent venv | Each service has its own requirements.txt |
| No shared code | Services talk only via HTTP |
| Easy to swap | Replace nlp-service with BERT later, backend unchanged |

---

## Project Structure

```
project-01-sentiment-analysis-dashboard/
│
├── frontend/                       ← React (Port 3000)
│   ├── src/
│   │   ├── components/Header.jsx
│   │   ├── pages/
│   │   │   ├── SingleAnalysisPage.jsx
│   │   │   └── BatchAnalysisPage.jsx
│   │   ├── services/sentimentApi.js  ← axios calls to backend
│   │   └── App.jsx
│   ├── .env                          ← REACT_APP_API_URL
│   └── package.json
│
├── backend/                        ← FastAPI (Port 8000)
│   ├── app/
│   │   ├── api/routes.py             ← receives from frontend
│   │   ├── core/service.py           ← httpx calls to nlp-service
│   │   ├── core/config.py            ← NLP_SERVICE_URL from .env
│   │   └── main.py
│   ├── .env                          ← NLP_SERVICE_URL=http://localhost:8001
│   └── requirements.txt              ← fastapi, httpx only (no nltk/sklearn)
│
├── nlp-service/                    ← FastAPI NLP (Port 8001)
│   ├── app/
│   │   ├── api/routes.py             ← /api/v1/nlp/predict
│   │   ├── core/preprocess.py        ← clean_text()
│   │   ├── core/service.py           ← loads model, runs inference
│   │   ├── core/config.py
│   │   └── main.py
│   ├── models/                       ← model.pkl, vectorizer.pkl
│   ├── train.py                      ← run once to train model
│   ├── .env
│   └── requirements.txt              ← fastapi, nltk, sklearn
│
├── tests/
│   ├── nlp-service/test_nlp_service.py
│   └── backend/test_backend.py
│
├── docker/
│   ├── Dockerfile.nlp-service
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── docker-compose.yml              ← wires all 3 services
└── .github/workflows/ci.yml        ← tests all 3 independently
```

---

## Local Run (Step by Step)

### Step 1 - Train NLP model

```bash
cd nlp-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python train.py
# saves nlp-service/models/model.pkl
```

### Step 2 - Start NLP Service (Terminal 1)

```bash
cd nlp-service
venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
# http://localhost:8001/docs
```

### Step 3 - Start Backend (Terminal 2)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# http://localhost:8000/docs
```

### Step 4 - Start Frontend (Terminal 3)

```bash
cd frontend
npm install
npm start
# http://localhost:3000
```

### Step 5 - Run Tests

```bash
# nlp-service tests
cd nlp-service && pytest ../tests/nlp-service/ -v

# backend tests
cd backend && pytest ../tests/backend/ -v
```

---

## Docker Run

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |
| NLP Service | http://localhost:8001/docs |

---

## API Flow

```
# 1. Frontend calls Backend
POST http://localhost:8000/api/v1/predict
{ "text": "This movie was fantastic!" }

# 2. Backend calls NLP Service internally
POST http://localhost:8001/api/v1/nlp/predict
{ "text": "This movie was fantastic!" }

# 3. NLP Service returns
{ "label": "pos", "sentiment": "Positive", "confidence": 94.5 }

# 4. Backend forwards to Frontend
{ "label": "pos", "sentiment": "Positive", "confidence": 94.5 }
```
