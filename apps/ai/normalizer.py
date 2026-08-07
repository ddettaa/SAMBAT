"""
SAMBAT — Banjar → Indonesian Normalizer
Kamus normalisasi Bahasa Banjar untuk klasifikasi laporan warga.

Sumber: Kamus Bahasa Banjar (330 halaman, ISBN 978-979-685-776-0)
         + kurasi manual kata-kata umum laporan warga
Entri: 3.078 kata
"""

import json
import os

_DICT_PATH = os.path.join(os.path.dirname(__file__), "banjar_dict.json")

with open(_DICT_PATH, "r") as f:
    BANJAR_DICT = json.load(f)


def normalize(text: str) -> tuple[str, list[str]]:
    """
    Normalisasi teks Banjar → Bahasa Indonesia.

    Args:
        text: Teks berbahasa Banjar atau campuran Banjar-Indonesia

    Returns:
        Tuple (normalized_text, list_of_replacements)

    Example:
        >>> normalize("lampu di muka rumah ulun mati")
        ('lampu di depan rumah saya mati', ['muka → depan', 'ulun → saya'])
    """
    words = text.lower().split()
    normalized = []
    replacements = []

    for word in words:
        clean = word.strip(".,!?;:\"'")
        if clean in BANJAR_DICT:
            normalized.append(BANJAR_DICT[clean])
            replacements.append(f"{clean} → {BANJAR_DICT[clean]}")
        else:
            normalized.append(word)

    return " ".join(normalized), replacements


if __name__ == "__main__":
    print(f"Dictionary size: {len(BANJAR_DICT)} entries")
    print()
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
        norm, repls = normalize(t)
        print(f"Banjar:  {t}")
        print(f"Indo:    {norm}")
        print(f"Changed: {len(repls)} words")
        print()
