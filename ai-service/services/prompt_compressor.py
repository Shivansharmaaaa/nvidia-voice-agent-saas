"""
Prompt Compression Service
Reduces prompt size to lower LLM token costs
"""

from typing import List, Dict
from loguru import logger


class PromptCompressor:
    """
    Compresses prompts while maintaining essential information
    Reduces token count and inference cost
    """

    def __init__(self, enabled: bool = True):
        self.enabled = enabled

    def compress_system_prompt(self, prompt: str) -> str:
        """Compress system prompt by removing redundancy"""
        if not self.enabled or not prompt:
            return prompt

        # Remove extra whitespace
        compressed = " ".join(prompt.split())

        # Remove redundant phrases
        redundant_phrases = [
            "please note that",
            "it is important to",
            "you should know that",
            "keep in mind that",
        ]

        for phrase in redundant_phrases:
            compressed = compressed.replace(phrase, "")

        # Limit length (keep first 500 chars of essential info)
        if len(compressed) > 500:
            # Try to preserve first sentence and key instructions
            sentences = compressed.split(".")
            if len(sentences) > 1:
                compressed = sentences[0] + ". " + " ".join(sentences[1:3])
            else:
                compressed = compressed[:500]

        return compressed.strip()

    def compress_conversation_history(
        self, history: List[Dict[str, str]], max_turns: int = 3
    ) -> List[Dict[str, str]]:
        """Compress conversation history to last N turns"""
        if not self.enabled:
            return history

        # Keep only last N turns
        if len(history) > max_turns * 2:  # Each turn = user + assistant
            return history[-(max_turns * 2):]

        return history

    def compress_knowledge_base(self, knowledge_base: Dict) -> str:
        """Compress knowledge base to essential facts"""
        if not self.enabled or not knowledge_base:
            return ""

        faqs = knowledge_base.get("faqs", [])
        if not faqs:
            return ""

        # Keep only first 3 most relevant FAQs
        compressed_faqs = faqs[:3]

        # Format as compact string
        return "\n".join([f"Q: {faq.split(':')[0] if ':' in faq else faq[:50]}" for faq in compressed_faqs])

    def estimate_token_savings(self, original: str, compressed: str) -> int:
        """Estimate token savings (rough: 1 token ≈ 4 characters)"""
        original_tokens = len(original) // 4
        compressed_tokens = len(compressed) // 4
        return max(0, original_tokens - compressed_tokens)
