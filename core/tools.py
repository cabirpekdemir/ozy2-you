# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — Tool Registry
Single responsibility: register, discover and dispatch tools/skills.
Tools register themselves — core knows nothing about specific tools.
"""
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

_registry: dict = {}  # tool_name → {fn, schema, package, permission}


def register(name: str, description: str, params: dict = None,
             package: str = "core", permission: str = "*"):
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
        _registry[name] = {"fn": fn, "schema": schema, "package": package, "permission": permission}
        logger.debug(f"[Tools] Registered: {name} ({package})")
        return fn

    return decorator


def register_fn(name: str, fn: Callable, description: str = "",
                params: dict = None, package: str = "core", permission: str = "*"):
    """Non-decorator variant for programmatic registration."""
    reg_decorator = register(name, description, params or {}, package, permission)
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


def get_permission(name: str) -> str:
    """Return the required permission tag for a tool."""
    return _registry.get(name, {}).get("permission", "*")


def get_all_schemas_for_permissions(permissions: list, packages=None) -> list:
    """Return tool schemas filtered by both package AND user's permission list."""
    has_all = "*" in permissions
    tools = []
    for name, meta in _registry.items():
        if packages is not None and meta["package"] not in packages:
            continue
        if not has_all:
            perm = meta.get("permission", "*")
            if perm != "*" and perm not in permissions:
                continue
        tools.append(meta["schema"])
    return tools


async def dispatch_with_permission(tool_name: str, args: dict, permissions: list = None) -> Any:
    """Call a tool, checking permission first."""
    if tool_name not in _registry:
        return {"error": f"Unknown tool: {tool_name}"}
    if permissions is not None:
        perm = _registry[tool_name].get("permission", "*")
        if perm != "*" and "*" not in permissions and perm not in permissions:
            return {"error": f"Permission denied: requires '{perm}'"}
    try:
        fn = _registry[tool_name]["fn"]
        result = fn(**args)
        if hasattr(result, "__await__"):
            result = await result
        return result
    except Exception as e:
        logger.error(f"[Tools] {tool_name} error: {e}")
        return {"error": str(e)}


def unregister(name: str):
    _registry.pop(name, None)
