"""
NVIDIA Nemotron 3 Nano LLM Service
Handles dialogue generation with context and RAG
"""

import asyncio
import httpx
import json
import logging
from typing import Optional, List, Dict
from loguru import logger
from config import settings
from services.circuit_breaker import CircuitBreaker, CircuitBreakerOpenError
from services.retry_handler import RetryHandler
from services.graceful_degradation import GracefulDegradation
from services.model_manager import ModelManager
from services.response_cache import ResponseCache
from services.prompt_compressor import PromptCompressor
from services.model_selector import ModelSelector


class NemotronLLMService:
    """
    NVIDIA Nemotron 3 Nano LLM service
    Handles context assembly, prompt injection, RAG, and response generation
    """

    def __init__(self, call_session_id: str):
        self.call_session_id = call_session_id
        self.base_url = settings.NEMOTRON_LLM_URL
        self.client: Optional[httpx.AsyncClient] = None
        self.api_key = settings.NVIDIA_API_KEY
        self.conversation_history: List[Dict[str, str]] = []
        self.agent_config: Optional[Dict] = None
        
        # Circuit breaker for LLM service
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            success_threshold=2,
            timeout=60.0,
        )
        
        # Retry handler
        self.retry_handler = RetryHandler(
            max_retries=2,  # Fewer retries for LLM (latency sensitive)
            initial_delay=0.5,
            retryable_exceptions=(httpx.HTTPError, httpx.TimeoutException),
        )
        
        # Graceful degradation
        self.degradation = GracefulDegradation()
        
        # Model manager for versioning
        self.model_manager = ModelManager()
        
        # Response cache
        self.cache = ResponseCache()
        
        # Prompt compressor
        self.compressor = PromptCompressor(enabled=True)
        
        # Model selector for dynamic model selection
        self.model_selector = ModelSelector(cost_optimization_enabled=True)

    async def initialize(self):
        """Initialize LLM service and load agent config"""
        logger.info(f"Initializing Nemotron LLM service for session: {self.call_session_id}")
        self.client = httpx.AsyncClient(timeout=60.0)
        
        # Initialize cache
        await self.cache.initialize()
        
        # Load agent configuration from backend
        await self._load_agent_config()

    async def _load_agent_config(self):
        """Load agent configuration from backend API"""
        try:
            response = await self.client.get(
                f"{settings.BACKEND_API_URL}/calls/{self.call_session_id}/agent-config"
            )
            if response.status_code == 200:
                self.agent_config = response.json()
                logger.info("Agent config loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load agent config: {e}")
            # Use default config
            self.agent_config = {
                "systemPrompt": "You are a helpful AI assistant.",
                "temperature": 0.7,
                "maxTokens": 500,
            }

    async def generate_response(self, user_text: str) -> Optional[str]:
        """
        Generate response using five-stage pipeline with optimizations:
        1. Context assembly
        2. Prompt injection (with compression)
        3. RAG (optional)
        4. LLM inference (with caching)
        5. Response scoring & safety
        """
        try:
            # Check cache first
            context_hash = str(hash(str(self.conversation_history[-3:])))  # Hash recent context
            cached_response = await self.cache.get(user_text, context_hash)
            if cached_response:
                logger.info("Using cached LLM response")
                self.conversation_history.append({"role": "user", "content": user_text})
                self.conversation_history.append({"role": "assistant", "content": cached_response})
                return cached_response

            # Stage 1: Context assembly
            context = self._assemble_context(user_text)
            
            # Stage 2: Prompt injection (with compression)
            messages = self._inject_prompt(context, user_text)
            
            # Compress prompts to reduce tokens
            if messages and len(messages) > 0:
                if messages[0].get("role") == "system":
                    messages[0]["content"] = self.compressor.compress_system_prompt(
                        messages[0]["content"]
                    )
                # Compress conversation history
                messages = [messages[0]] + self.compressor.compress_conversation_history(
                    messages[1:], max_turns=3
                )
            
            # Stage 3: RAG (optional knowledge retrieval)
            enhanced_messages = await self._apply_rag(messages, user_text)
            
            # Stage 4: LLM inference
            response = await self._llm_inference(enhanced_messages)
            
            # Stage 5: Response scoring & safety
            safe_response = self._score_and_validate(response)
            
            # Cache response
            await self.cache.set(user_text, context_hash, safe_response)
            
            # Update conversation history
            self.conversation_history.append({"role": "user", "content": user_text})
            self.conversation_history.append({"role": "assistant", "content": safe_response})
            
            # Keep history manageable (last 10 turns)
            if len(self.conversation_history) > 20:
                self.conversation_history = self.conversation_history[-20:]
            
            return safe_response
            
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            return "I apologize, but I'm having trouble processing that. Could you please repeat?"

    def _assemble_context(self, user_text: str) -> Dict:
        """Assemble conversation context"""
        return {
            "conversation_history": self.conversation_history[-6:],  # Last 3 turns
            "user_input": user_text,
            "agent_config": self.agent_config,
        }

    def _inject_prompt(self, context: Dict, user_text: str) -> List[Dict[str, str]]:
        """Inject system prompt and format messages"""
        system_prompt = self.agent_config.get("systemPrompt", "You are a helpful AI assistant.")
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for turn in context["conversation_history"]:
            messages.append(turn)
        
        # Add current user input
        messages.append({"role": "user", "content": user_text})
        
        return messages

    async def _apply_rag(self, messages: List[Dict], user_text: str) -> List[Dict]:
        """Apply RAG if knowledge base is available"""
        if not self.agent_config or not self.agent_config.get("knowledgeBase"):
            return messages
        
        # Simple keyword-based retrieval (can be enhanced with vector search)
        knowledge_base = self.agent_config.get("knowledgeBase", {})
        faqs = knowledge_base.get("faqs", [])
        
        # Find relevant FAQ
        relevant_context = ""
        for faq in faqs:
            if any(keyword.lower() in user_text.lower() for keyword in faq.split(":")[0].split()):
                relevant_context += faq + "\n"
        
        if relevant_context:
            # Inject knowledge into system message
            messages[0]["content"] += f"\n\nRelevant information:\n{relevant_context}"
        
        return messages

    async def _llm_inference(self, messages: List[Dict[str, str]]) -> str:
        """Call Nemotron 3 Nano LLM with circuit breaker and retry"""
        if not self.client:
            # Mock response for development
            return "Thank you for your question. I'm here to help."

        async def _llm_call():
            # Dynamic model selection based on query complexity
            cost_target = self.agent_config.get("costTarget", "balanced")
            context_length = sum(len(str(m.get("content", ""))) for m in messages)
            
            # Get user_text from messages (last user message)
            user_text = ""
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    user_text = msg.get("content", "")
                    break
            
            selected_model = self.model_selector.select_model(
                user_text,
                context_length,
                cost_target,
            )
            
            # Use NVIDIA NIM API if API key is set
            if self.api_key:
                # Try multiple endpoint formats for NVIDIA API
                base = self.base_url.rstrip('/v1').rstrip('/')
                endpoints_to_try = [
                    f"{base}/v1/chat/completions",
                    f"{base}/chat/completions",
                    f"{base}/v1/models/{settings.NEMOTRON_LLM_MODEL}/chat/completions",
                ]
                
                model_name = settings.NEMOTRON_LLM_MODEL
                last_error = None
                
                for api_url in endpoints_to_try:
                    try:
                        response = await self.client.post(
                            api_url,
                            json={
                                "model": model_name,
                                "messages": messages,
                                "temperature": self.agent_config.get("temperature", 0.7),
                                "max_tokens": selected_model.get("max_tokens", 500),
                                "stream": False,
                            },
                            timeout=30.0,
                        )
                        
                        if response.status_code == 200:
                            # Success - break and process response
                            break
                        else:
                            last_error = f"{api_url} returned {response.status_code}"
                            logger.debug(f"Tried {api_url}: {response.status_code}")
                            continue
                    except Exception as e:
                        last_error = f"{api_url}: {str(e)}"
                        logger.debug(f"Tried {api_url}: {e}")
                        continue
                else:
                    # All endpoints failed - use mock response
                    logger.warning(f"All LLM endpoints failed. Last error: {last_error}")
                    logger.info("Using mock LLM response (NVIDIA API endpoints not available)")
                    # Return a contextual mock response
                    if "pricing" in user_text.lower() or "price" in user_text.lower():
                        return "Our pricing plans start at $29/month for the basic plan, $99/month for professional, and custom enterprise pricing available. Would you like more details?"
                    elif "appointment" in user_text.lower() or "book" in user_text.lower():
                        return "I'd be happy to help you book an appointment. What date and time works best for you?"
                    elif "support" in user_text.lower() or "help" in user_text.lower():
                        return "I'm here to help! What can I assist you with today?"
                    else:
                        return f"Thank you for your message. I understand you're asking about: {user_text}. How can I help you further?"
                
                # If we get here, we have a successful response
                if response.status_code != 200:
                    raise httpx.HTTPError(f"LLM API error: {response.status_code}")
            else:
                # Local/self-hosted model
                model_version = self.agent_config.get("llmModelVersion")
                model_url = self.model_manager.get_model_url(selected_model["name"], model_version)
                model_name = selected_model["name"]
                api_url = f"{model_url}/chat/completions"
                
                response = await self.client.post(
                    api_url,
                    json={
                        "model": model_name,
                        "messages": messages,
                        "temperature": self.agent_config.get("temperature", 0.7),
                        "max_tokens": selected_model.get("max_tokens", 500),
                        "stream": False,
                    },
                    timeout=30.0,  # 30s timeout for LLM
                )
            
            if response.status_code == 200:
                data = response.json()
                if not data:
                    logger.error("LLM API returned empty response")
                    raise httpx.HTTPError("LLM API returned empty response")
                choices = data.get("choices", [])
                if not choices or len(choices) == 0:
                    logger.error(f"LLM API returned no choices. Response: {data}")
                    raise httpx.HTTPError("LLM API returned no choices")
                message = choices[0].get("message", {})
                if not message:
                    logger.error(f"LLM API returned invalid message structure. Choices: {choices}")
                    raise httpx.HTTPError("LLM API returned invalid message structure")
                content = message.get("content", "")
                if not content:
                    logger.error(f"LLM API returned empty content. Message: {message}")
                    raise httpx.HTTPError("LLM API returned empty content")
                return content
            else:
                error_text = response.text if hasattr(response, 'text') else str(response.status_code)
                logger.error(f"LLM API error {response.status_code}: {error_text}")
                raise httpx.HTTPError(f"LLM API error: {response.status_code} - {error_text}")

        try:
            # Use circuit breaker with retry
            result = await self.circuit_breaker.call(
                lambda: self.retry_handler.execute(_llm_call)
            )
            return result
        except CircuitBreakerOpenError:
            logger.error("LLM circuit breaker is OPEN - using fallback")
            # Use graceful degradation
            return self.degradation.get_fallback_response("llm_failure")
        except Exception as e:
            logger.error(f"Error calling LLM: {e}")
            return self.degradation.get_fallback_response("llm_failure")

    def _score_and_validate(self, response: str) -> str:
        """Score response and apply safety checks"""
        # Basic safety checks
        if len(response) > 1000:
            response = response[:1000] + "..."
        
        # Remove any potential PII (basic check)
        # In production, use a proper PII detection service
        response = response.replace("SSN:", "[REDACTED]")
        response = response.replace("Credit Card:", "[REDACTED]")
        
        return response

    async def cleanup(self):
        """Cleanup LLM service"""
        if self.client:
            await self.client.aclose()
            self.client = None
