from fastapi import FastAPI
from pydantic import BaseModel
from ml_engine.vectorizer import TurkishVectorizer

app = FastAPI()
_vectorizer = TurkishVectorizer()  # model bir kez yüklenir


class EmbedRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
def embed(req: EmbedRequest):
    return {"embedding": _vectorizer.get_embedding(req.text)}
