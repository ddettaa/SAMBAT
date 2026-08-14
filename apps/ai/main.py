from fastapi import FastAPI
from pydantic import BaseModel

from normalizer import normalize
from classifier import classify
from embeddings import get_embedding

app = FastAPI(title="SAMBAT AI Service", version="0.3.0")


class NormalizeRequest(BaseModel):
    text: str


class NormalizeResponse(BaseModel):
    normalized: str
    replacements: list[str]
    words_changed: int


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    scores: dict[str, int] = {}
    normalized: str
    words_changed: int
    location: str = ""
    urgency: str = "low"
    reasoning: str = ""
    model: str = ""
    llm_used: bool = False


@app.get("/health")
def health():
    return {"ok": True, "service": "ai", "version": "0.3.0"}


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
    result = classify(req.text)
    # isi field dengan default supaya response model cocok
    result.setdefault("scores", {})
    result.setdefault("location", "")
    result.setdefault("urgency", "low")
    result.setdefault("reasoning", "")
    result.setdefault("model", "")
    result.setdefault("llm_used", False)
    return result


@app.post("/embed", response_model=EmbedResponse)
def embed_text(req: EmbedRequest):
    vec = get_embedding(req.text)
    return EmbedResponse(embedding=vec)
