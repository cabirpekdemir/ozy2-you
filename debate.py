# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — AI Debate
Runs a multi-AI debate in the terminal.

Usage:
  python3 debate.py
  python3 debate.py "Is AGI possible in 10 years?"
  python3 debate.py --rounds 3 "Does free will exist?"
"""

import sys
import asyncio
import argparse
import json
from pathlib import Path

# ── Keys ──────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent
KEYS_FILE  = Path("/Users/cabirpekdemir/Ozy/config/debate_keys.json")
OZY_CFG    = ROOT / "config" / "settings.json"

def load_keys() -> dict:
    keys = {}
    if KEYS_FILE.exists():
        keys.update(json.loads(KEYS_FILE.read_text()))
    if OZY_CFG.exists():
        cfg = json.loads(OZY_CFG.read_text())
        if cfg.get("api_key"):
            keys.setdefault("gemini", cfg["api_key"])
    return keys

# ── Terminal colors ────────────────────────────────────────────────────────────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    models = {
        "Gemini":   "\033[94m",   # blue
        "Claude":   "\033[95m",   # purple
        "GPT-4o":   "\033[92m",   # green
        "Grok":     "\033[93m",   # yellow
        "DeepSeek": "\033[96m",   # cyan
        "Qwen":     "\033[91m",   # red
    }

def color(model: str, text: str) -> str:
    return C.models.get(model, "") + text + C.RESET

def header(text: str):
    width = 70
    print(f"\n{C.BOLD}{'─'*width}{C.RESET}")
    print(f"{C.BOLD}  {text}{C.RESET}")
    print(f"{C.BOLD}{'─'*width}{C.RESET}\n")

# ── Model configs ──────────────────────────────────────────────────────────────
def get_models(keys: dict) -> list:
    models = []
    if keys.get("gemini"):
        models.append({"id": "gemini",    "name": "Gemini",   "model": "gemini-2.5-flash"})
    if keys.get("claude"):
        models.append({"id": "claude",    "name": "Claude",   "model": "claude-sonnet-4-6"})
    if keys.get("gpt4o"):
        models.append({"id": "gpt4o",     "name": "GPT-4o",   "model": "gpt-4o"})
    if keys.get("grok"):
        models.append({"id": "grok",      "name": "Grok",     "model": "grok-3-fast"})
    if keys.get("deepseek"):
        models.append({"id": "deepseek",  "name": "DeepSeek", "model": "deepseek-chat"})
    if keys.get("qwen"):
        models.append({"id": "qwen",      "name": "Qwen",     "model": "qwen-turbo"})
    return models

# ── LLM calls ─────────────────────────────────────────────────────────────────
async def call_gemini(model_id: str, api_key: str, messages: list, system: str) -> str:
    from google import genai
    from google.genai import types
    client   = genai.Client(api_key=api_key)
    contents = []
    for m in messages:
        role = "model" if m["role"] == "assistant" else "user"
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += "\n" + m["content"]
        else:
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
    cfg  = types.GenerateContentConfig(system_instruction=system) if system else None
    resp = client.models.generate_content(model=model_id, contents=contents, config=cfg)
    return resp.text or ""

async def call_openai_compat(base_url: str, api_key: str, model_id: str,
                              messages: list, system: str) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    msgs   = ([{"role": "system", "content": system}] if system else []) + messages
    resp   = await client.chat.completions.create(model=model_id, messages=msgs, max_tokens=512)
    return resp.choices[0].message.content or ""

async def call_anthropic(api_key: str, model_id: str, messages: list, system: str) -> str:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=api_key)
    kwargs = {"model": model_id, "max_tokens": 512, "messages": messages}
    if system:
        kwargs["system"] = system
    resp = await client.messages.create(**kwargs)
    return resp.content[0].text if resp.content else ""

async def ask_model(m: dict, keys: dict, messages: list, system: str) -> tuple:
    """Returns (name, response_text)."""
    try:
        mid = m["id"]
        if mid == "gemini":
            text = await call_gemini(m["model"], keys["gemini"], messages, system)
        elif mid == "claude":
            text = await call_anthropic(keys["claude"], m["model"], messages, system)
        elif mid == "gpt4o":
            text = await call_openai_compat(
                "https://api.openai.com/v1", keys["gpt4o"], m["model"], messages, system)
        elif mid == "grok":
            text = await call_openai_compat(
                "https://api.x.ai/v1", keys["grok"], m["model"], messages, system)
        elif mid == "deepseek":
            text = await call_openai_compat(
                "https://api.deepseek.com/v1", keys["deepseek"], m["model"], messages, system)
        elif mid == "qwen":
            text = await call_openai_compat(
                "https://dashscope.aliyuncs.com/compatible-mode/v1",
                keys["qwen"], m["model"], messages, system)
        else:
            text = "(unsupported provider)"
        return m["name"], text.strip()
    except Exception as e:
        return m["name"], f"[Error: {e}]"

# ── Debate logic ───────────────────────────────────────────────────────────────
async def run_debate(topic: str, models: list, keys: dict, rounds: int = 2):
    history: dict[str, list] = {m["name"]: [] for m in models}
    all_responses: list[tuple] = []   # (round, name, text)

    for round_num in range(1, rounds + 1):
        header(f"Round {round_num} — {topic}")

        if round_num == 1:
            system_tpl = (
                "You are {name}, an AI assistant taking part in a debate. "
                "Give your opening position on the topic in 3-4 sentences. "
                "Be direct, specific, and opinionated."
            )
        else:
            prev = "\n\n".join(
                f"{name}: {text}"
                for _, name, text in all_responses
                if _ == round_num - 1
            )
            system_tpl = (
                "You are {name}, debating with other AIs. "
                "Here is what was said in the previous round:\n\n" + prev + "\n\n"
                "Respond with a focused rebuttal or counter-argument in 3-4 sentences."
            )

        # Ask all models in parallel
        tasks = []
        for m in models:
            sys_prompt = system_tpl.format(name=m["name"])
            msgs       = [{"role": "user", "content": f'Debate topic: "{topic}"'}]
            tasks.append(ask_model(m, keys, msgs, sys_prompt))

        print(f"  {C.DIM}Asking {len(models)} models...{C.RESET}\n")
        results = await asyncio.gather(*tasks)

        for name, text in results:
            all_responses.append((round_num, name, text))
            prefix = color(name, f"  ● {name}")
            print(f"{prefix}")
            # Word-wrap at 70 chars
            words = text.split()
            line  = "    "
            for w in words:
                if len(line) + len(w) + 1 > 72:
                    print(line)
                    line = "    " + w + " "
                else:
                    line += w + " "
            if line.strip():
                print(line)
            print()

    # ── Summary ───────────────────────────────────────────────────────────
    header("Summary")
    for m in models:
        responses = [t for r, n, t in all_responses if n == m["name"]]
        print(color(m["name"], f"  {m['name']}:"))
        summary = responses[-1][:160] + "..." if len(responses[-1]) > 160 else responses[-1]
        print(f"  {C.DIM}{summary}{C.RESET}\n")

# ── CLI ────────────────────────────────────────────────────────────────────────
def pick_topic() -> str:
    suggestions = [
        "Is AGI possible within the next 10 years?",
        "Does free will exist?",
        "Is remote work better than office work?",
        "Will AI replace software engineers?",
        "Is social media net positive for society?",
        "Should AI be open source?",
    ]
    print(f"\n{C.BOLD}  ✦  OZY2 — AI Debate{C.RESET}")
    print(f"  {C.DIM}Powered by Gemini · Claude · GPT-4o · Grok · DeepSeek · Qwen{C.RESET}\n")
    print("  Suggested topics:")
    for i, s in enumerate(suggestions, 1):
        print(f"  {C.DIM}{i}.{C.RESET} {s}")
    print()
    choice = input("  Enter topic or number [1-6]: ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(suggestions):
        return suggestions[int(choice) - 1]
    return choice or suggestions[0]

def pick_models(available: list) -> list:
    print(f"\n  Available models:")
    for i, m in enumerate(available, 1):
        print(f"  {C.DIM}{i}.{C.RESET} {color(m['name'], m['name'])}")
    print(f"  {C.DIM}Press Enter to use all, or enter numbers e.g. 1,2,3{C.RESET}")
    choice = input("  Select models: ").strip()
    if not choice:
        return available
    indices = [int(x.strip()) - 1 for x in choice.split(",") if x.strip().isdigit()]
    selected = [available[i] for i in indices if 0 <= i < len(available)]
    return selected or available

async def main():
    parser = argparse.ArgumentParser(description="OZY2 AI Debate")
    parser.add_argument("topic",   nargs="?",    help="Debate topic")
    parser.add_argument("--rounds", type=int, default=2, help="Number of rounds (default 2)")
    parser.add_argument("--all",   action="store_true", help="Use all available models")
    args = parser.parse_args()

    keys   = load_keys()
    models = get_models(keys)

    if not models:
        print("No API keys found. Check config/settings.json or Ozy/config/debate_keys.json")
        sys.exit(1)

    topic = args.topic or pick_topic()
    if not args.topic and not args.all:
        models = pick_models(models)

    print(f"\n  {C.BOLD}Topic:{C.RESET} {topic}")
    print(f"  {C.BOLD}Models:{C.RESET} {', '.join(color(m['name'], m['name']) for m in models)}")
    print(f"  {C.BOLD}Rounds:{C.RESET} {args.rounds}\n")

    await run_debate(topic, models, keys, rounds=args.rounds)
    print(f"\n{C.DIM}  Debate complete.{C.RESET}\n")

if __name__ == "__main__":
    asyncio.run(main())
