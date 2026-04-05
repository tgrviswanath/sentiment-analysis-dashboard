import asyncio
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
async def predict_single(input: TextInput):
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, predict, input.text)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/batch", response_model=list[PredictResponse])
async def predict_batch(input: BatchInput):
    try:
        loop = asyncio.get_running_loop()
        import functools
        return await loop.run_in_executor(None, lambda: [predict(t) for t in input.texts])
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
