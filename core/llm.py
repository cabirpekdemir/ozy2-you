"""
OZY2 — LLM Client
Single responsibility: communicate with any LLM provider.
Supports: Gemini, OpenAI, Anthropic, Ollama
"""
import asyncio
import logging
from typing import AsyncGenerator, Optional

logger = logging.getLogger(__name__)


class LLMClient:
    SUPPORTED = {"gemini", "openai", "anthropic", "ollama"}

    def __init__(self, provider: str, model: str, api_key: str = ""):
        self.provider = provider.lower()
        self.model    = model
        self.api_key  = api_key
        self._client  = None
        self._init_client()

    def _init_client(self):
        if self.provider == "gemini":
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"[LLM] Gemini init failed: {e}")

        elif self.provider == "openai":
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self.api_key)
            except Exception as e:
                logger.error(f"[LLM] OpenAI init failed: {e}")

        elif self.provider == "anthropic":
            try:
                import anthropic
                self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
            except Exception as e:
                logger.error(f"[LLM] Anthropic init failed: {e}")

        elif self.provider == "ollama":
            try:
                from ollama import AsyncClient
                self._client = AsyncClient()
            except Exception as e:
                logger.error(f"[LLM] Ollama init failed: {e}")

    async def chat(self, messages: list[dict], system: str = "",
                   tools: list | None = None) -> str:
        """Single-turn chat. Returns text response."""
        try:
            if self.provider == "gemini":
                return await self._chat_gemini(messages, system, tools)
            elif self.provider == "openai":
                return await self._chat_openai(messages, system, tools)
            elif self.provider == "anthropic":
                return await self._chat_anthropic(messages, system)
            elif self.provider == "ollama":
                return await self._chat_ollama(messages, system)
        except Exception as e:
            logger.error(f"[LLM] chat error ({self.provider}): {e}")
            return f"[LLM Error] {e}"

    async def stream(self, messages: list[dict],
                     system: str = "") -> AsyncGenerator[str, None]:
        """Streaming chat. Yields text chunks."""
        try:
            if self.provider == "gemini":
                async for chunk in self._stream_gemini(messages, system):
                    yield chunk
            elif self.provider == "openai":
                async for chunk in self._stream_openai(messages, system):
                    yield chunk
            elif self.provider == "anthropic":
                async for chunk in self._stream_anthropic(messages, system):
                    yield chunk
            elif self.provider == "ollama":
                async for chunk in self._stream_ollama(messages, system):
                    yield chunk
        except Exception as e:
            logger.error(f"[LLM] stream error ({self.provider}): {e}")
            yield f"[Stream Error] {e}"

    # ── Gemini ────────────────────────────────────────────────────────────────
    @staticmethod
    def _to_gemini_contents(messages: list) -> list:
        """Convert messages to Gemini format (role must be 'user' or 'model')."""
        result = []
        for m in messages:
            role    = "model" if m["role"] == "assistant" else "user"
            content = m.get("content", "")
            if not content:
                continue
            # Merge consecutive same-role messages (Gemini requires alternating)
            if result and result[-1]["role"] == role:
                result[-1]["parts"][0]["text"] += "\n" + content
            else:
                result.append({"role": role, "parts": [{"text": content}]})
        return result

    async def _chat_gemini(self, messages, system, tools):
        from google.genai import types
        contents = self._to_gemini_contents(messages)
        cfg = types.GenerateContentConfig(system_instruction=system) if system else None
        resp = self._client.models.generate_content(
            model=self.model, contents=contents, config=cfg
        )
        return resp.text or ""

    async def _stream_gemini(self, messages, system):
        from google.genai import types
        contents = self._to_gemini_contents(messages)
        cfg = types.GenerateContentConfig(system_instruction=system) if system else None
        for chunk in self._client.models.generate_content_stream(
            model=self.model, contents=contents, config=cfg
        ):
            if chunk.text:
                yield chunk.text

    # ── OpenAI ────────────────────────────────────────────────────────────────
    async def _chat_openai(self, messages, system, tools):
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        kwargs = {"model": self.model, "messages": msgs}
        if tools:
            kwargs["tools"] = tools
        resp = await self._client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""

    async def _stream_openai(self, messages, system):
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        stream = await self._client.chat.completions.create(
            model=self.model, messages=msgs, stream=True
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    # ── Anthropic ─────────────────────────────────────────────────────────────
    async def _chat_anthropic(self, messages, system):
        kwargs = {"model": self.model, "max_tokens": 4096, "messages": messages}
        if system:
            kwargs["system"] = system
        resp = await self._client.messages.create(**kwargs)
        return resp.content[0].text if resp.content else ""

    async def _stream_anthropic(self, messages, system):
        kwargs = {"model": self.model, "max_tokens": 4096,
                  "messages": messages, "stream": True}
        if system:
            kwargs["system"] = system
        async with self._client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text

    # ── Ollama ────────────────────────────────────────────────────────────────
    async def _chat_ollama(self, messages, system):
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        resp = await self._client.chat(model=self.model, messages=msgs)
        return resp["message"]["content"]

    async def _stream_ollama(self, messages, system):
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        async for chunk in await self._client.chat(
            model=self.model, messages=msgs, stream=True
        ):
            if chunk.get("message", {}).get("content"):
                yield chunk["message"]["content"]
