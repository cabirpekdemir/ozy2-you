"""
OZY2 — Agent
Coordination only. Receives a message, decides what to do, returns response.
Does NOT contain business logic — delegates to llm, tools, memory.
"""
import json
import logging
from pathlib import Path
from core.llm      import LLMClient
from core.memory   import get_history, add_message, build_memory_block
from core.tools    import get_all_schemas, dispatch, is_known

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are OZY — a personal AI assistant.
You are direct, helpful, and action-oriented.
You have access to tools. Use them when needed — don't ask unnecessarily.
{memory_block}
Current time: {now}
"""


class Agent:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    async def think(self, user_message: str,
                    notify_fn=None) -> str:
        """
        Main entry point. Returns assistant response text.
        notify_fn: optional async callback for streaming updates to UI.
        """
        from datetime import datetime

        # Build context
        history      = get_history(limit=20)
        memory_block = build_memory_block()
        system       = SYSTEM_PROMPT.format(
            memory_block=f"\n{memory_block}" if memory_block else "",
            now=datetime.now().strftime("%d %B %Y, %H:%M")
        )

        # Add user message to history
        add_message("user", user_message)
        messages = history + [{"role": "user", "content": user_message}]

        # Get tool schemas (only registered tools)
        tools = get_all_schemas()

        # Call LLM
        response = await self.llm.chat(
            messages=messages,
            system=system,
            tools=tools if tools else None
        )

        # Handle tool calls if response contains them (Gemini/OpenAI style)
        # This is a simplified handler — extend per provider needs
        if isinstance(response, dict) and "tool_calls" in response:
            tool_results = []
            for call in response["tool_calls"]:
                name   = call.get("name") or call.get("function", {}).get("name")
                args   = call.get("args") or json.loads(
                    call.get("function", {}).get("arguments", "{}")
                )
                if is_known(name):
                    result = await dispatch(name, args)
                    tool_results.append({"tool": name, "result": result})

            # Second LLM call with tool results
            messages.append({"role": "assistant", "content": str(response)})
            messages.append({"role": "user", "content": str(tool_results)})
            response = await self.llm.chat(messages=messages, system=system)

        text = response if isinstance(response, str) else str(response)

        # Save to history
        add_message("assistant", text)

        return text

    async def stream_think(self, user_message: str):
        """Streaming version — yields text chunks."""
        from datetime import datetime

        history      = get_history(limit=20)
        memory_block = build_memory_block()
        system       = SYSTEM_PROMPT.format(
            memory_block=f"\n{memory_block}" if memory_block else "",
            now=datetime.now().strftime("%d %B %Y, %H:%M")
        )

        add_message("user", user_message)
        messages = history + [{"role": "user", "content": user_message}]

        full_response = ""
        async for chunk in self.llm.stream(messages=messages, system=system):
            full_response += chunk
            yield chunk

        add_message("assistant", full_response)
