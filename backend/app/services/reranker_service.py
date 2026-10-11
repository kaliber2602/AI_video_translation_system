# app/services/reranker_service.py
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger('app.services.reranker_service')

_cross_encoder_instance = None

def get_cross_encoder():
    global _cross_encoder_instance
    if _cross_encoder_instance is None:
        try:
            from sentence_transformers import CrossEncoder
            _cross_encoder_instance = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            logger.info('[RerankerService] Loaded CrossEncoder model successfully.')
        except Exception as e:
            logger.warning(f'[RerankerService] Failed to load CrossEncoder model: {e}')
            _cross_encoder_instance = None
    return _cross_encoder_instance

class RerankerService:
    def __init__(self):
        pass

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 6
    ) -> List[Dict[str, Any]]:
        if not candidates or not query.strip():
            return []
        model = get_cross_encoder()
        if not model:
            sorted_candidates = sorted(candidates, key=lambda x: x.get('relevance_score', 0.0), reverse=True)
            return sorted_candidates[:top_k]
        try:
            pairs = []
            for c in candidates:
                orig = (c.get('text') or '').strip()
                trans = (c.get('translated_text') or '').strip()
                if trans and orig:
                    corpus_text = f"{trans} - {orig}"
                else:
                    corpus_text = trans or orig
                pairs.append((query, corpus_text))
            scores = model.predict(pairs)
            import math
            for idx, c in enumerate(candidates):
                raw_score = float(scores[idx])
                c['rerank_score'] = raw_score
                # Convert raw logits (-12 to +12) to smooth calibrated probability [0, 1] via sigmoid
                prob = 1.0 / (1.0 + math.exp(-raw_score))
                c['relevance_score'] = round(prob, 4)

            reranked = sorted(candidates, key=lambda x: x.get('rerank_score', -999.0), reverse=True)
            # If the best match is strongly relevant (> 0), filter out any completely negative noise (< -7.0)
            if reranked and reranked[0].get('rerank_score', -999.0) > 0.0:
                reranked = [r for r in reranked if r.get('rerank_score', -999.0) >= -6.5]
            return reranked[:top_k]
        except Exception as e:
            logger.warning(f'[RerankerService] CrossEncoder scoring failed, using vector order: {e}')
            sorted_candidates = sorted(candidates, key=lambda x: x.get('relevance_score', 0.0), reverse=True)
            return sorted_candidates[:top_k]
