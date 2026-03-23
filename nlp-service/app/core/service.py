import pickle
import os
from app.core.preprocess import clean_text
from app.core.config import settings

_model = None
_vectorizer = None


def get_model():
    global _model, _vectorizer
    if _model is None:
        if not os.path.exists(settings.MODEL_PATH):
            raise FileNotFoundError(
                "Model not found. Run: python train.py inside nlp-service/"
            )
        _model = pickle.load(open(settings.MODEL_PATH, "rb"))
        _vectorizer = pickle.load(open(settings.VECTORIZER_PATH, "rb"))
    return _model, _vectorizer


def predict(text: str) -> dict:
    model, vectorizer = get_model()
    cleaned = clean_text(text)
    vec = vectorizer.transform([cleaned])
    label = model.predict(vec)[0]
    proba = model.predict_proba(vec)[0]
    confidence = round(float(max(proba)) * 100, 2)
    return {
        "label": label,
        "sentiment": "Positive" if label == "pos" else "Negative",
        "confidence": confidence,
    }
