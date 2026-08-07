from fastapi import FastAPI
from pydantic import BaseModel

from normalizer import normalize

app = FastAPI(title="SAMBAT AI Service", version="0.1.0")


class NormalizeRequest(BaseModel):
    text: str


class NormalizeResponse(BaseModel):
    normalized: str
    replacements: list[str]
    words_changed: int


@app.get("/health")
def health():
    return {"ok": True, "service": "ai"}


@app.post("/normalize", response_model=NormalizeResponse)
def normalize_text(req: NormalizeRequest):
    normalized, replacements = normalize(req.text)
    return NormalizeResponse(
        normalized=normalized,
        replacements=replacements,
        words_changed=len(replacements),
    )
