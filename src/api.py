from fastapi import FastAPI
from pydantic import BaseModel
from src.predict import predict

app = FastAPI(title="Sentiment Analysis API")


class TextInput(BaseModel):
    text: str


@app.get("/")
def root():
    return {"message": "Sentiment Analysis API is running"}


@app.post("/predict")
def predict_sentiment(input: TextInput):
    result = predict(input.text)
    return result
