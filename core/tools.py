"""
OZY2 — Tool Registry
Single responsibility: register, discover and dispatch tools/skills.
Tools register themselves — core knows nothing about specific tools.
"""
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

_registry: dict = {}  # tool_name → {fn, schema, package}


def register(name: str, description: str, params: dict = None,
             package: str = "core"):
    """
    Decorator-style registration:

        @register(name="my_tool", description="Does X", params={...})
        async def handler(arg1, arg2):
            ...
    """
    params = params or {}
    # Build JSON Schema for this tool
    schema = {
        "name":        name,
        "description": description,
        "parameters": {
            "type":       "object",
            "properties": {
                k: (v if isinstance(v, dict) else {"type": "string", "description": str(v)})
                for k, v in params.items()
            },
            "required": [k for k, v in params.items()
                         if isinstance(v, dict) and v.get("required", False)],
        },
    }

    def decorator(fn: Callable):
        _registry[name] = {"fn": fn, "schema": schema, "package": package}
        logger.debug(f"[Tools] Registered: {name} ({package})")
        return fn

    return decorator


def register_fn(name: str, fn: Callable, description: str = "",
                params: dict = None, package: str = "core"):
    """Non-decorator variant for programmatic registration."""
    reg_decorator = register(name, description, params or {}, package)
    reg_decorator(fn)


def get_all_schemas(packages=None) -> list:
    """Return tool schemas for LLM function calling."""
    tools = []
    for name, meta in _registry.items():
        if packages is None or meta["package"] in packages:
            tools.append(meta["schema"])
    return tools


def get_names(packages=None) -> list:
    return [n for n, m in _registry.items()
            if packages is None or m["package"] in packages]


async def dispatch(tool_name: str, args: dict) -> Any:
    """Call a registered tool by name."""
    if tool_name not in _registry:
        logger.warning(f"[Tools] Unknown tool: {tool_name}")
        return {"error": f"Unknown tool: {tool_name}"}
    try:
        fn     = _registry[tool_name]["fn"]
        result = fn(**args)
        if hasattr(result, "__await__"):
            result = await result
        return result
    except Exception as e:
        logger.error(f"[Tools] {tool_name} error: {e}")
        return {"error": str(e)}


def is_known(name: str) -> bool:
    return name in _registry


def unregister(name: str):
    _registry.pop(name, None)
