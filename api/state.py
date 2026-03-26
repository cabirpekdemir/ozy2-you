"""OZY2 — Global app state. One agent instance shared across requests."""
import json
import logging
from pathlib import Path
from core.llm   import LLMClient
from core.agent import Agent

logger   = logging.getLogger(__name__)
CONFIG   = Path(__file__).parent.parent / "config" / "settings.json"
_agent: Agent | None = None


def load_config() -> dict:
    if CONFIG.exists():
        return json.loads(CONFIG.read_text())
    return {}


def get_agent() -> Agent:
    global _agent
    if _agent is None:
        cfg = load_config()
        llm = LLMClient(
            provider=cfg.get("provider", "gemini"),
            model=cfg.get("model", "gemini-2.5-flash"),
            api_key=cfg.get("api_key", ""),
        )
        _agent = Agent(llm)
        logger.info(f"[State] Agent ready — {cfg.get('provider')} / {cfg.get('model')}")
    return _agent


def reset_agent():
    global _agent
    _agent = None
