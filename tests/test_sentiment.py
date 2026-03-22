import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.preprocess import clean_text
from src.predict import predict


def test_clean_text_removes_stopwords():
    result = clean_text("This is a very good movie")
    assert "is" not in result.split()
    assert "a" not in result.split()


def test_clean_text_removes_special_chars():
    result = clean_text("Hello!!! This is great!!!")
    assert "!" not in result


def test_clean_text_lowercase():
    result = clean_text("HELLO WORLD")
    assert result == result.lower()


def test_predict_returns_label_and_confidence():
    result = predict("This movie was absolutely fantastic and I loved it")
    assert "label" in result
    assert "confidence" in result
    assert result["label"] in ["pos", "neg"]
    assert 0 <= result["confidence"] <= 100
