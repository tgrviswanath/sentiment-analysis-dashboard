from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.service import predict

router = APIRouter(prefix="/api/v1/nlp", tags=["nlp"])


class TextInput(BaseModel):
    text: str


class BatchInput(BaseModel):
    texts: list[str]


class PredictResponse(BaseModel):
    label: str
    sentiment: str
    confidence: float


@router.post("/predict", response_model=PredictResponse)
def predict_single(input: TextInput):
    try:
        return predict(input.text)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/predict/batch", response_model=list[PredictResponse])
def predict_batch(input: BatchInput):
    try:
        return [predict(text) for text in input.texts]
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
