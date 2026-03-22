from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.predict import predict

app = FastAPI(title="Sentiment Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextInput(BaseModel):
    text: str


@app.get("/api")
def root():
    return {"message": "Sentiment Analysis API is running"}


@app.post("/api/predict")
def predict_sentiment(input: TextInput):
    result = predict(input.text)
    return result
