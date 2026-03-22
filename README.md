# Project 01 - Sentiment Analysis Dashboard

Analyze text sentiment (positive/negative) using TF-IDF + Logistic Regression.
React frontend + FastAPI backend.

## Project Structure

```
project-01-sentiment-analysis-dashboard/
├── src/
│   ├── preprocess.py           # Text cleaning
│   ├── train.py                # Model training
│   ├── predict.py              # Prediction logic
│   └── api.py                  # FastAPI backend
├── tests/
│   └── test_sentiment.py       # Unit tests
├── docker/
│   ├── Dockerfile              # API Dockerfile
│   └── docker-compose.yml      # Full stack
├── ui/                         # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── SingleAnalysis.jsx
│   │   │   └── BatchAnalysis.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── models/                     # Saved model files (auto-created)
├── data/
├── requirements.txt
└── README.md
```

## Local Run (Step by Step)

### Backend Setup

#### Step 1 - Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
```

#### Step 2 - Install dependencies
```bash
pip install -r requirements.txt
```

#### Step 3 - Train the model
```bash
python src/train.py
```
Downloads NLTK movie_reviews dataset and saves model to models/

#### Step 4 - Start FastAPI backend
```bash
uvicorn src.api:app --reload --port 8000
```
- API runs at http://localhost:8000
- API docs at http://localhost:8000/docs

### Frontend Setup (new terminal)

#### Step 5 - Install React dependencies
```bash
cd ui
npm install
```

#### Step 6 - Start React UI
```bash
npm start
```
- UI runs at http://localhost:3000

### Run Tests
```bash
pytest tests/ -v
```

## Docker Run (Full Stack)

```bash
cd docker
docker-compose up --build
```
- API: http://localhost:8000
- UI:  http://localhost:3000

## API Usage

```bash
# Single prediction
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "This movie was absolutely fantastic!"}'

# Response
{
  "label": "pos",
  "confidence": 94.5
}
```

## Tech Stack

| Layer | Tool |
|-------|------|
| UI | React 18, MUI, Recharts |
| Backend | FastAPI |
| Preprocessing | NLTK |
| Feature Extraction | TF-IDF (scikit-learn) |
| Model | Logistic Regression |
| Deployment | Docker |
