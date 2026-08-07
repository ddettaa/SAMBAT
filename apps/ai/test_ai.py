from fastapi.testclient import TestClient
import main

c = TestClient(main.app)

# health
assert c.get("/health").json()["ok"] is True

# normalize
r = c.post("/normalize", json={"text": "lampu di muka rumah ulun mati"})
assert r.status_code == 200
assert r.json()["normalized"] == "lampu di depan rumah saya mati"

# classify
r = c.post("/classify", json={"text": "sampah tumpuk di higa jambat, kada ada urang bacari"})
assert r.status_code == 200
assert r.json()["category"] == "sampah"
assert r.json()["confidence"] >= 0.5

r = c.post("/classify", json={"text": "pian kawa tolong lapor? jalan gelap, PJU padam semua"})
assert r.json()["category"] == "lampu"

r = c.post("/classify", json={"text": "banyu naik sampai dalam rumah, banar banjir"})
assert r.json()["category"] == "drainase"

r = c.post("/classify", json={"text": "selamat pagi semua"})
assert r.json()["category"] == "lainnya"

# response harus punya field yang dipakai API
r = c.post("/classify", json={"text": "sampah menumpuk di depan rumah"})
j = r.json()
for field in ["category", "confidence", "scores", "normalized", "words_changed", "llm_used"]:
    assert field in j, f"missing {field}"

print("ALL AI TESTS PASSED")
