import pickle
from src.preprocess import clean_text


def load_model():
    model = pickle.load(open("models/model.pkl", "rb"))
    vectorizer = pickle.load(open("models/vectorizer.pkl", "rb"))
    return model, vectorizer


def predict(text: str) -> dict:
    model, vectorizer = load_model()
    cleaned = clean_text(text)
    vec = vectorizer.transform([cleaned])
    label = model.predict(vec)[0]
    proba = model.predict_proba(vec)[0]
    confidence = round(max(proba) * 100, 2)
    return {"label": label, "confidence": confidence}
