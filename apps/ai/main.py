from fastapi import FastAPI
from pydantic import BaseModel

from normalizer import normalize
from classifier import classify

app = FastAPI(title="SAMBAT AI Service", version="0.2.0")


class NormalizeRequest(BaseModel):
    text: str


class NormalizeResponse(BaseModel):
    normalized: str
    replacements: list[str]
    words_changed: int


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    scores: dict[str, int]
    normalized: str
    words_changed: int


@app.get("/health")
def health():
    return {"ok": True, "service": "ai", "version": "0.2.0"}


@app.post("/normalize", response_model=NormalizeResponse)
def normalize_text(req: NormalizeRequest):
    normalized, replacements = normalize(req.text)
    return NormalizeResponse(
        normalized=normalized,
        replacements=replacements,
        words_changed=len(replacements),
    )


@app.post("/classify", response_model=ClassifyResponse)
def classify_text(req: ClassifyRequest):
    return classify(req.text)
