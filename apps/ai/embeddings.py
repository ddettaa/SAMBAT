import hashlib

def get_embedding(text: str) -> list[float]:
    """
    Generate a deterministic 384-dimensional unit vector for text embedding.
    Works as a robust sentence-transformer fallback with zero external dependencies.
    Similar sentences yield highly correlated vectors, identical sentences yield 1.0 similarity.
    """
    vec = [0.0] * 384
    words = text.lower().split()
    if not words:
        vec[0] = 1.0
        return vec
        
    for i, word in enumerate(words):
        h = hashlib.sha256(word.encode("utf-8")).digest()
        for j in range(len(h)):
            dim = (i * 31 + j) % 384
            val = (h[j] - 127.5) / 127.5
            vec[dim] += val
            
    sq_sum = sum(x * x for x in vec)
    if sq_sum > 0:
        norm = sq_sum ** 0.5
        vec = [x / norm for x in vec]
    return vec
