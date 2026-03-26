"""
OZY2 — Scheduler
Single responsibility: run tasks on schedule (interval, daily, cron).
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Callable

logger = logging.getLogger(__name__)


class Scheduler:
    def __init__(self):
        self._tasks: dict[str, asyncio.Task] = {}
        self._running = False

    def start(self):
        self._running = True
        logger.info("[Scheduler] Started")

    def stop(self):
        self._running = False
        for t in self._tasks.values():
            t.cancel()
        self._tasks.clear()
        logger.info("[Scheduler] Stopped")

    def add_interval(self, name: str, fn: Callable,
                     seconds: int, delay: int = 60) -> asyncio.Task:
        """Run fn every `seconds` seconds, starting after `delay` seconds."""
        self._cancel(name)

        async def _run():
            await asyncio.sleep(delay)
            while self._running:
                await self._call(name, fn)
                await asyncio.sleep(seconds)

        task = asyncio.create_task(_run())
        self._tasks[name] = task
        return task

    def add_daily(self, name: str, fn: Callable,
                  hour: int, minute: int = 0) -> asyncio.Task:
        """Run fn every day at hour:minute."""
        self._cancel(name)

        async def _run():
            while self._running:
                now    = datetime.now()
                target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if target <= now:
                    target += timedelta(days=1)
                await asyncio.sleep((target - datetime.now()).total_seconds())
                if not self._running:
                    break
                await self._call(name, fn)
                await asyncio.sleep(60)

        task = asyncio.create_task(_run())
        self._tasks[name] = task
        return task

    def add_cron(self, name: str, fn: Callable, expr: str) -> asyncio.Task:
        """Run fn according to cron expression (requires croniter)."""
        self._cancel(name)

        async def _run():
            try:
                from croniter import croniter
            except ImportError:
                logger.error("[Scheduler] croniter not installed: pip install croniter")
                return
            while self._running:
                nxt  = croniter(expr, datetime.now()).get_next(datetime)
                wait = (nxt - datetime.now()).total_seconds()
                if wait > 0:
                    await asyncio.sleep(wait)
                if not self._running:
                    break
                await self._call(name, fn)
                await asyncio.sleep(61)

        task = asyncio.create_task(_run())
        self._tasks[name] = task
        return task

    def remove(self, name: str):
        self._cancel(name)

    def status(self) -> dict:
        return {
            "running": self._running,
            "tasks": [
                {"name": n, "done": t.done(), "cancelled": t.cancelled()}
                for n, t in self._tasks.items()
            ]
        }

    def _cancel(self, name: str):
        if name in self._tasks:
            self._tasks[name].cancel()
            del self._tasks[name]

    async def _call(self, name: str, fn: Callable):
        try:
            logger.info(f"[Scheduler] Running: {name}")
            result = fn()
            if asyncio.iscoroutine(result):
                await result
        except Exception as e:
            logger.error(f"[Scheduler] {name} error: {e}")


scheduler = Scheduler()
