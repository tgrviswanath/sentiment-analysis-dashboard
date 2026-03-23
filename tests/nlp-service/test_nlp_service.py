import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "nlp-service"))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.preprocess import clean_text

client = TestClient(app)


def test_clean_text_lowercase():
    assert clean_text("HELLO WORLD") == clean_text("hello world")


def test_clean_text_removes_stopwords():
    result = clean_text("this is a very good movie")
    assert "is" not in result.split()


def test_clean_text_removes_html():
    assert "<b>" not in clean_text("<b>Great</b> movie")


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_predict_single():
    res = client.post("/api/v1/nlp/predict", json={"text": "This movie was fantastic"})
    assert res.status_code == 200
    data = res.json()
    assert "label" in data
    assert "sentiment" in data
    assert "confidence" in data
    assert 0 <= data["confidence"] <= 100


def test_predict_batch():
    res = client.post("/api/v1/nlp/predict/batch", json={
        "texts": ["Great movie", "Terrible film"]
    })
    assert res.status_code == 200
    assert len(res.json()) == 2
