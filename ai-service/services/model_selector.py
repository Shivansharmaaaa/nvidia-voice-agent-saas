"""
Dynamic Model Selection Service
Selects optimal model size based on query complexity and cost targets
"""

from typing import Optional, Dict
from loguru import logger


class ModelSelector:
    """
    Selects between small and large models based on:
    - Query complexity
    - Cost targets
    - Latency requirements
    """

    MODELS = {
        "small": {
            "name": "nemotron-3-nano",
            "cost_per_1k_tokens": 0.001,  # Lower cost
            "max_tokens": 500,
            "latency_ms": 100,
        },
        "large": {
            "name": "nemotron-3-8b",
            "cost_per_1k_tokens": 0.005,  # Higher cost
            "max_tokens": 2000,
            "latency_ms": 300,
        },
    }

    def __init__(self, cost_optimization_enabled: bool = True):
        self.cost_optimization_enabled = cost_optimization_enabled

    def select_model(
        self,
        user_input: str,
        context_length: int = 0,
        cost_target: Optional[str] = "balanced",
    ) -> Dict:
        """
        Select optimal model based on input characteristics
        
        Args:
            user_input: User's text input
            context_length: Length of conversation context
            cost_target: "low", "balanced", or "quality"
        
        Returns:
            Model configuration dict
        """
        if not self.cost_optimization_enabled:
            return self.MODELS["large"]  # Default to large

        # Analyze input complexity
        input_length = len(user_input)
        word_count = len(user_input.split())
        
        # Simple heuristics for model selection
        is_simple_query = (
            word_count < 10
            and input_length < 100
            and not any(keyword in user_input.lower() for keyword in [
                "explain", "describe", "analyze", "compare", "why", "how"
            ])
        )

        # Cost target logic
        if cost_target == "low":
            # Always use small model for cost savings
            return self.MODELS["small"]
        elif cost_target == "quality":
            # Always use large model for quality
            return self.MODELS["large"]
        else:  # balanced
            # Use small for simple queries, large for complex
            if is_simple_query and context_length < 1000:
                logger.info("Selecting small model for simple query")
                return self.MODELS["small"]
            else:
                logger.info("Selecting large model for complex query")
                return self.MODELS["large"]

    def estimate_cost(self, model_name: str, tokens: int) -> float:
        """Estimate cost for model usage"""
        model = next(
            (m for m in self.MODELS.values() if m["name"] == model_name),
            self.MODELS["large"]
        )
        return (tokens / 1000) * model["cost_per_1k_tokens"]

    def get_model_recommendation(
        self, avg_query_length: int, cost_budget: float
    ) -> Dict:
        """Get model recommendation based on usage patterns"""
        small_cost = self.estimate_cost("nemotron-3-nano", avg_query_length * 10)
        large_cost = self.estimate_cost("nemotron-3-8b", avg_query_length * 10)

        if small_cost <= cost_budget:
            return {
                "recommended": "small",
                "estimated_savings": large_cost - small_cost,
                "reason": "Small model fits within budget",
            }
        else:
            return {
                "recommended": "large",
                "estimated_savings": 0,
                "reason": "Large model required for quality",
            }
