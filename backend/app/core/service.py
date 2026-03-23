import httpx
from app.core.config import settings

NLP_URL = settings.NLP_SERVICE_URL


async def predict_sentiment(text: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NLP_URL}/api/v1/nlp/predict",
            json={"text": text},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()


async def predict_sentiment_batch(texts: list[str]) -> list[dict]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NLP_URL}/api/v1/nlp/predict/batch",
            json={"texts": texts},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
