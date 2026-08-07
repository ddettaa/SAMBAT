import os

# Force deterministic rule fallback for regressions; network LLM tested separately by integration.
os.environ["LLM_API_KEY"] = ""

from classifier import _llm_classify, _rule_classify, _redact_pii, _validate_llm_result

for text in ["perjalanan dinas lancar", "buang waktu", "mata air di gunung", "surut hati"]:
    result = _rule_classify(text)
    assert result["category"] == "lainnya", (text, result)

assert _rule_classify("jalan berlubang parah")["category"] == "jalan"
assert _rule_classify("sampah dibuang sembarangan")["category"] == "sampah"
assert "081234567890" not in _redact_pii("hubungi 081234567890 di adit@example.com")
assert "adit@example.com" not in _redact_pii("hubungi adit@example.com")
assert _validate_llm_result({"category": "lampu", "confidence": "unknown"}) is None
assert _validate_llm_result({"category": "lampu", "confidence": 0.9, "urgency": "extreme"})["urgency"] == "medium"
print("AI SECURITY REGRESSIONS PASSED")
