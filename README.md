# Project 01 - Sentiment Analysis Dashboard

Microservice NLP system that classifies text as Positive or Negative using TF-IDF + Logistic Regression trained on the NLTK Movie Reviews dataset.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  (React - Port 8080)                              │
│  axios POST /api/v1/predict                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP JSON
┌──────────────────────▼──────────────────────────────────────┐
│  BACKEND  (FastAPI - Port 8000)                             │
│  httpx POST /api/v1/nlp/predict  →  calls nlp-service       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP JSON
┌──────────────────────▼──────────────────────────────────────┐
│  NLP SERVICE  (FastAPI - Port 8001)                         │
│  Loads model.pkl + vectorizer.pkl                           │
│  clean_text → TF-IDF → LogisticRegression                   │
│  Returns { label, sentiment, confidence }                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Microservices

| Benefit               | How                                                    |
|-----------------------|--------------------------------------------------------|
| Independent deployment | Each service has its own Docker image                 |
| Independent scaling   | Scale nlp-service only when needed                    |
| Independent venv      | Each service has its own requirements.txt             |
| No shared code        | Services talk only via HTTP                           |
| Easy to swap          | Replace nlp-service with BERT later, backend unchanged |

---

## Model Performance

Trained on NLTK Movie Reviews (2000 documents, 80/20 split):

```
              precision    recall  f1-score   support

         neg       0.82      0.81      0.82       199
         pos       0.82      0.83      0.82       201

    accuracy                           0.82       400
   macro avg       0.82      0.82      0.82       400
weighted avg       0.82      0.82      0.82       400
```

---

## Prerequisites

- Python 3.12+
- Node.js via **nvs** — run `nvs use 20.14.0` before starting the frontend

---

## Local Run (Step by Step)

### Step 1 — Train the NLP model (run once)

```bash
cd nlp-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python train.py
# Output: models/model.pkl + models/vectorizer.pkl
# Accuracy: ~82%
```

### Step 2 — Start NLP Service (Terminal 1)

```bash
cd nlp-service
venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
```

Verify: http://localhost:8001/health → `{"status":"ok"}`

### Step 3 — Start Backend (Terminal 2)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Verify: http://localhost:8000/health → `{"status":"ok"}`

### Step 4 — Start Frontend (Terminal 3)

```bash
nvs use 20.14.0
cd frontend
npm install
npm start
```

Opens at: http://localhost:8080

> **Note:** The frontend runs on port **8080** (not 3000) due to the local environment.
> The backend `.env` already includes `http://localhost:8080` in `ALLOWED_ORIGINS`.

---

## Environment Files

### `backend/.env`

```
APP_NAME=Sentiment Analysis API
APP_VERSION=1.0.0
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8080"]
NLP_SERVICE_URL=http://localhost:8001
```

### `frontend/.env`

```
REACT_APP_API_URL=http://localhost:8000
```

### `nlp-service/.env`

```
SERVICE_PORT=8001
```

---

## Quick Verify (curl)

```bash
# Health checks
curl http://localhost:8001/health
curl http://localhost:8000/health

# Test prediction end-to-end
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"This movie was absolutely fantastic!\"}"

# Expected response
{"label":"pos","sentiment":"Positive","confidence":51.91}
```

---

## Sample Inputs

Ready-to-use test inputs are in the `samples/` folder:

| File                            | Use                                      |
|---------------------------------|------------------------------------------|
| `samples/positive_reviews.txt`  | 5 positive texts — paste into Single tab |
| `samples/negative_reviews.txt`  | 5 negative texts — paste into Single tab |
| `samples/neutral_reviews.txt`   | 5 neutral texts — paste into Single tab  |
| `samples/batch_input.txt`       | 10 mixed texts — paste into Batch tab    |

---

## Run Tests

```bash
# NLP service tests
cd nlp-service
venv\Scripts\activate
pytest ../tests/nlp-service/ -v

# Backend tests
cd backend
venv\Scripts\activate
pytest ../tests/backend/ -v
```

---

## Docker Run

```bash
docker-compose up --build
```

| Service          | URL                          |
|------------------|------------------------------|
| Frontend         | http://localhost:3000        |
| Backend API docs | http://localhost:8000/docs   |
| NLP Service docs | http://localhost:8001/docs   |

---

## Project Structure

```
project-01-sentiment-analysis-dashboard/
├── frontend/                       ← React (Port 8080 locally)
│   ├── src/
│   │   ├── components/Header.jsx
│   │   ├── pages/
│   │   │   ├── SingleAnalysisPage.jsx
│   │   │   └── BatchAnalysisPage.jsx
│   │   ├── services/sentimentApi.js
│   │   └── App.jsx
│   ├── .env                        ← REACT_APP_API_URL=http://localhost:8000
│   └── package.json
│
├── backend/                        ← FastAPI (Port 8000)
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/service.py         ← httpx → nlp-service
│   │   ├── core/config.py
│   │   └── main.py
│   ├── .env                        ← ALLOWED_ORIGINS includes :8080
│   └── requirements.txt
│
├── nlp-service/                    ← FastAPI NLP (Port 8001)
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/preprocess.py      ← clean_text()
│   │   ├── core/service.py         ← loads model, runs inference
│   │   └── main.py
│   ├── models/                     ← model.pkl, vectorizer.pkl (after train.py)
│   ├── train.py                    ← run once to generate models
│   └── requirements.txt
│
├── samples/                        ← ready-to-use test inputs
├── tests/
│   ├── backend/test_backend.py
│   └── nlp-service/test_nlp_service.py
├── docker/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## API Reference

```
POST /api/v1/predict
Body:     { "text": "string" }
Response: { "label": "pos|neg", "sentiment": "Positive|Negative", "confidence": float }

POST /api/v1/predict/batch
Body:     { "texts": ["string", ...] }
Response: [{ "label": "pos|neg", "sentiment": "Positive|Negative", "confidence": float }]
```
