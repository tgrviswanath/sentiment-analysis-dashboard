import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

MOCK_RESPONSE = {"label": "pos", "sentiment": "Positive", "confidence": 92.5}


def test_health():
    res = client.get("/health")
    assert res.status_code == 200


@patch("app.core.service.predict_sentiment", new_callable=AsyncMock, return_value=MOCK_RESPONSE)
def test_predict_single(mock_predict):
    res = client.post("/api/v1/predict", json={"text": "Great movie"})
    assert res.status_code == 200
    data = res.json()
    assert data["sentiment"] == "Positive"
    assert data["confidence"] == 92.5


@patch("app.core.service.predict_sentiment_batch", new_callable=AsyncMock,
       return_value=[MOCK_RESPONSE, MOCK_RESPONSE])
def test_predict_batch(mock_batch):
    res = client.post("/api/v1/predict/batch", json={"texts": ["Great", "Awesome"]})
    assert res.status_code == 200
    assert len(res.json()) == 2
