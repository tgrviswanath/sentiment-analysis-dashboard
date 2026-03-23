from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.service import predict_sentiment, predict_sentiment_batch
import httpx

router = APIRouter(prefix="/api/v1", tags=["sentiment"])


class TextInput(BaseModel):
    text: str


class BatchInput(BaseModel):
    texts: list[str]


@router.post("/predict")
async def predict(input: TextInput):
    try:
        return await predict_sentiment(input.text)
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="NLP service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))


@router.post("/predict/batch")
async def predict_batch(input: BatchInput):
    try:
        return await predict_sentiment_batch(input.texts)
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="NLP service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
