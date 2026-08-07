"""
SAMBAT — Klasifikasi kategori laporan warga.

Strategi: LLM-FIRST (9Router / btlbagus)
1. Coba LLM dulu — klasifikasi + ekstraksi lokasi + urgensi + reasoning
2. Kalau LLM gagal/offline/timeout → fallback rule-based keyword (tetap jalan)
3. Kalau rule-based juga tidak yakin → kategori 'lainnya' (operator yang putuskan)

Kenapa LLM-first:
- Paham konteks & bahasa campuran Banjar-Indonesia lebih baik
- Bisa ekstrak lokasi (nama jalan/kelurahan) sekaligus
- Bisa nilai urgensi (untuk formula prioritas U)
"""

import json
import os
import re
import urllib.request

from normalizer import normalize

CATEGORIES = ["sampah", "drainase", "jalan", "lampu", "lainnya"]

# ─── LLM config ──────────────────────────────────────────────
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://72.61.142.52:20128/v1")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "btlbagus")
LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", "45"))

SYSTEM_PROMPT = """Kamu adalah AI classifier untuk SAMBAT, sistem pengaduan warga Banjarmasin.
Tugasmu: klasifikasi laporan warga (bisa Bahasa Banjar atau campuran Banjar-Indonesia).

Kategori:
- sampah: penumpukan sampah, pembuangan liar, TPS penuh, bau
- drainase: selokan/parit mampet, genangan, banjir, air naik, rob
- jalan: jalan rusak, lubang, aspal pecah, jembatan rusak
- lampu: PJU padam, gelap, penerangan rusak
- lainnya: bukan empat kategori di atas

Balas HANYA dengan JSON valid, tanpa teks lain:
{
  "category": "salah satu kategori",
  "confidence": 0.0-1.0,
  "location": "nama jalan/kelurahan jika ada, kosong jika tidak",
  "urgency": "low|medium|high|critical",
  "reasoning": "1 kalimat singkat"
}"""


def _extract_json(text: str) -> dict | None:
    """3-level JSON extraction: strict → lenient → brace auto-complete."""
    # Bersihkan markdown fence kalau ada
    text = re.sub(r"```(?:json)?", "", text).strip()
    # 1. strict
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    # 2. lenient: first { to last }
    first = text.find("{")
    last = text.rfind("}")
    if first >= 0 and last > first:
        try:
            return json.loads(text[first : last + 1])
        except json.JSONDecodeError:
            pass
    # 3. brace auto-complete
    m = re.search(r"\{[\s\S]*", text)
    if m:
        attempt = m.group(0)
        open_ = attempt.count("{")
        close = attempt.count("}")
        while close < open_:
            attempt += "}"
            close += 1
        open_ = attempt.count("[")
        close = attempt.count("]")
        while close < open_:
            attempt += "]"
            close += 1
        try:
            return json.loads(attempt)
        except json.JSONDecodeError:
            pass
    return None


def _llm_classify(text: str) -> dict | None:
    """Klasifikasi via LLM. Return None kalau gagal/offline."""
    if not LLM_API_KEY:
        return None

    body = json.dumps({
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Laporan warga:\n{text}\n\nJSON:"},
        ],
        "temperature": 0.2,
        "max_tokens": 500,
        "stream": False,
    }).encode()

    req = urllib.request.Request(
        f"{LLM_BASE_URL}/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {LLM_API_KEY}",
        },
    )

    # Retry 2x dengan backoff — 9Router kadang timeout di request pertama
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=LLM_TIMEOUT) as resp:
                data = json.loads(resp.read().decode())
            break
        except Exception:
            if attempt == 2:
                return None
            import time
            time.sleep(2 * (attempt + 1))

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
        content = data.get("choices", [{}])[0].get("message", {}).get("reasoning_content", "")
    if not content:
        return None

    result = _extract_json(content)
    if not result:
        return None

    # Validasi kategori
    cat = result.get("category", "").strip().lower()
    if cat not in CATEGORIES:
        cat = "lainnya"
    confidence = float(result.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))

    return {
        "category": cat,
        "confidence": round(confidence, 2),
        "location": str(result.get("location", "")).strip(),
        "urgency": str(result.get("urgency", "medium")).strip(),
        "reasoning": str(result.get("reasoning", "")).strip(),
        "model": LLM_MODEL,
    }


# ─── Rule-based fallback ──────────────────────────────────────

KEYWORDS: dict[str, list[str]] = {
    "sampah": [
        "sampah", "tumpuk", "limbah", "kotor", "bau", "busuk", "buang", "berserakan",
        "menumpuk", "penuh", "barandah", "rampung", "sisa", "plastik", "botol",
        "sampah menumpuk", "tps", "tempat sampah", "dibuang",
    ],
    "drainase": [
        "drainase", "selokan", "parit", "mampet", "buntu", "tersumbat", "banyu",
        "air", "banjir", "genangan", "naik", "turun", "rob", "pasang", "surut",
        "bah", "tanggul", "got", "saluran", "meluap", "kebanjiran", "kabanyakan",
        "tidak turun", "nggak turun",
    ],
    "jalan": [
        "jalan", "jembatan", "jambat", "lubang", "rusak", "aspal", "trotoar",
        "pecah", "ambrol", "berlubang", "jambatan", "tambak", "jalanan",
        "tutup lubang", "bahu jalan",
    ],
    "lampu": [
        "lampu", "pju", "listrik", "padam", "mati", "gelap", "terang", "penerangan",
        "lampu jalan", "pju padam", "gelap gulita", "nyala",
    ],
}


def _rule_classify(text: str) -> dict:
    """Fallback: keyword matching setelah normalisasi Banjar."""
    normalized, replacements = normalize(text)
    t = normalized.lower()
    scores = {cat: 0 for cat in CATEGORIES}
    for cat, kws in KEYWORDS.items():
        for kw in kws:
            if kw in t:
                scores[cat] += 1

    total = sum(scores.values())
    if total == 0:
        return {
            "category": "lainnya",
            "confidence": 0.0,
            "location": "",
            "urgency": "low",
            "reasoning": "rule-based: tidak ada keyword match",
            "model": "rule-based",
            "normalized": normalized,
            "words_changed": len(replacements),
        }

    best_cat = max(scores, key=lambda c: scores[c])
    best_score = scores[best_cat]
    confidence = best_score / total
    if best_score >= 2:
        confidence = min(1.0, confidence + 0.15)
    if confidence < 0.3:
        best_cat = "lainnya"

    # Urgensi heuristic: kata kunci bahaya
    urgency = "low"
    if any(w in t for w in ["banjir", "kebakaran", "ambrol", "rob", "bahaya", "darurat", "kecelakaan"]):
        urgency = "high"
    elif any(w in t for w in ["gelap", "macet", "penuh", "meluap"]):
        urgency = "medium"

    return {
        "category": best_cat,
        "confidence": round(confidence, 2),
        "location": "",
        "urgency": urgency,
        "reasoning": "rule-based keyword match",
        "model": "rule-based",
        "normalized": normalized,
        "words_changed": len(replacements),
    }


# ─── Public API ───────────────────────────────────────────────

def classify(text: str) -> dict:
    """Klasifikasi laporan. LLM dulu, fallback rule-based kalau gagal."""
    llm = _llm_classify(text)

    if llm:
        # Normalisasi tetap dihitung untuk info (dan fallback konsistensi)
        normalized, replacements = normalize(text)
        llm["normalized"] = normalized
        llm["words_changed"] = len(replacements)
        llm["llm_used"] = True
        return llm

    result = _rule_classify(text)
    result["llm_used"] = False
    return result


if __name__ == "__main__":
    tests = [
        "lampu jalan di muka rumah ulun mati sudah tiga malam",
        "sampah tumpuk di higa jambat, kada ada urang bacari",
        "banyu naik sampai dalam rumah, banar banjir tagal kada ada lapor",
        "drainase mampet, jalan rusak banar, handak parbaiki",
        "pian kawa tolong lapor? jalan gelap, PJU padam semua",
        "imbah hujan, banyu kada turun, selokan penuh sampah",
        "tolong pang, jambat ngini rusak, masih urang pakai",
        "kampung ulun banjir rob tiap malam, kada tahan lagi",
        "pambakal kami handak lapor karusakan jambatan di sungai",
        "selamat pagi, mau tanya jam buka pasar terapung",
    ]
    print(f"LLM: {LLM_BASE_URL} model={LLM_MODEL} key={'SET' if LLM_API_KEY else 'EMPTY'}")
    for t in tests:
        r = classify(t)
        print(
            f"[{'LLM' if r.get('llm_used') else 'RULE'}] "
            f"{r['category']:10s} ({r['confidence']:4.2f}) "
            f"urg={r['urgency']:7s} loc={r.get('location','')[:20]:20s} | {t}"
        )
