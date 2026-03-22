# Project 01 - Sentiment Analysis Dashboard

Analyze text sentiment (positive/negative) using TF-IDF + Logistic Regression.

## Project Structure

```
project-01-sentiment-analysis-dashboard/
├── src/
│   ├── preprocess.py       # Text cleaning
│   ├── train.py            # Model training
│   ├── predict.py          # Prediction logic
│   └── api.py              # FastAPI backend
├── tests/
│   └── test_sentiment.py   # Unit tests
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── models/                 # Saved model files (auto-created)
├── data/                   # Dataset files
├── app.py                  # Streamlit UI
├── requirements.txt
└── .github/
    └── workflows/
        └── ci.yml          # GitHub Actions CI/CD
```

## Local Run (Step by Step)

### Step 1 - Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
```

### Step 2 - Install dependencies
```bash
pip install -r requirements.txt
```

### Step 3 - Train the model
```bash
python src/train.py
```
This downloads the NLTK movie_reviews dataset and saves model to models/

### Step 4 - Start FastAPI backend
```bash
uvicorn src.api:app --reload --port 8000
```
API runs at http://localhost:8000
API docs at http://localhost:8000/docs

### Step 5 - Start Streamlit UI (new terminal)
```bash
streamlit run app.py
```
UI runs at http://localhost:8501

### Step 6 - Run tests
```bash
pytest tests/ -v
```

## Docker Run

```bash
cd docker
docker-compose up --build
```
- API: http://localhost:8000
- UI:  http://localhost:8501

## API Usage

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "This movie was absolutely fantastic!"}'
```

Response:
```json
{
  "label": "pos",
  "confidence": 94.5
}
```

## Dataset
- NLTK Movie Reviews (built-in, auto-downloaded)
- 2000 reviews, balanced pos/neg

## Tech Stack
| Layer | Tool |
|-------|------|
| UI | Streamlit |
| Backend | FastAPI |
| Preprocessing | NLTK |
| Feature Extraction | TF-IDF (scikit-learn) |
| Model | Logistic Regression |
| Visualization | Matplotlib, Seaborn |
| Deployment | Docker |
