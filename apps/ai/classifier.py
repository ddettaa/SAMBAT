"""
SAMBAT — Klasifikasi kategori laporan warga.

Strategi berlapis (biar jalan tanpa GPU/dataset besar):
1. Rule-based keyword match (cepat, deterministik) — kata kunci Banjar & Indonesia per kategori
2. Normalizer Banjar dulu, lalu keyword match Indonesia
3. (Optional) LLM API kalau keyword match confidence rendah — TODO setelah key tersedia
"""

from normalizer import normalize

CATEGORIES = ["sampah", "drainase", "jalan", "lampu", "lainnya"]

# Kata kunci per kategori (Indonesia + Banjar, sesudah normalisasi sebagian besar jadi Indonesia)
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

# Aturan prioritas: kalau dua kategori match, skor tertinggi menang.
# Tie → urutan: drainase > sampah > jalan > lampu (bahaya > kebersihan > kenyamanan)


def _score(text: str) -> dict[str, int]:
    """Hitung skor keyword per kategori."""
    t = text.lower()
    scores = {cat: 0 for cat in CATEGORIES}
    for cat, kws in KEYWORDS.items():
        for kw in kws:
            if kw in t:
                scores[cat] += 1
    return scores


def classify(text: str, confidence_threshold: float = 0.3) -> dict:
    """
    Klasifikasi teks laporan ke kategori.

    Returns:
        {
          "category": "sampah",
          "confidence": 0.92,
          "scores": {"sampah": 2, ...},
          "normalized": "teks setelah normalisasi"
        }
    """
    normalized, replacements = normalize(text)
    scores = _score(normalized)
    total = sum(scores.values())

    if total == 0:
        return {
            "category": "lainnya",
            "confidence": 0.0,
            "scores": scores,
            "normalized": normalized,
            "words_changed": len(replacements),
        }

    # Pilih kategori dengan skor tertinggi
    best_cat = max(scores, key=lambda c: scores[c])
    best_score = scores[best_cat]

    # Confidence: proporsi skor kategori terbaik vs total, dinaikkan kalau ada kata kunci kuat
    confidence = best_score / total
    # Bonus kalau kata kunci spesifik (2+ kata) yang match
    if best_score >= 2:
        confidence = min(1.0, confidence + 0.15)

    # Kalau confidence di bawah threshold → "lainnya" (biar operator yang putuskan)
    if confidence < confidence_threshold:
        return {
            "category": "lainnya",
            "confidence": round(confidence, 2),
            "scores": scores,
            "normalized": normalized,
            "words_changed": len(replacements),
        }

    return {
        "category": best_cat,
        "confidence": round(confidence, 2),
        "scores": scores,
        "normalized": normalized,
        "words_changed": len(replacements),
    }


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
        "batakun: kabanjiran tiap tahun, kada ada tanggul",
        "guring kada nyaman, bau busuk dari parit di muka rumah",
    ]
    for t in tests:
        r = classify(t)
        print(f"{r['category']:10s} ({r['confidence']:4.2f}) | {t}")
