#!/usr/bin/env python3
"""SAMBAT social collector.

First run: python3 playwright_collector.py --login x
Polling:  python3 playwright_collector.py --once
The browser storage state contains cookies only and must stay mode 600.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from playwright.sync_api import Page, sync_playwright

ROOT = Path(os.environ.get("PLAYWRIGHT_SESSION_DIR", "/var/lib/sambat/browser"))
API_URL = os.environ.get("SAMBAT_API_URL", "http://127.0.0.1:3001").rstrip("/")
API_KEY = os.environ.get("COLLECTOR_API_KEY", "")
ACCOUNT = os.environ.get("SAMBAT_SOCIAL_ACCOUNT", "SAMBAT_BJM")


def state_path(source: str) -> Path:
    return ROOT / f"{source}-state.json"


def require_env(*names: str) -> None:
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise SystemExit(f"missing environment: {', '.join(missing)}")


def login(page: Page, source: str) -> None:
    """Create a persistent cookie state; human completes OTP/CAPTCHA if shown."""
    username = os.environ.get(f"{source.upper()}_USERNAME", ACCOUNT)
    password = os.environ.get(f"{source.upper()}_PASSWORD", "")
    if source == "x":
        page.goto("https://x.com/i/flow/login", wait_until="domcontentloaded", timeout=45_000)
        page.locator('input[autocomplete="username"]').fill(username)
        page.keyboard.press("Enter")
        page.wait_for_timeout(1200)
        if password:
            page.locator('input[name="password"]').fill(password)
            page.keyboard.press("Enter")
    else:
        page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded", timeout=45_000)
        if password:
            page.locator('input[name="username"]').fill(username)
            page.locator('input[name="password"]').fill(password)
            page.keyboard.press("Enter")
    print(f"Complete any OTP/CAPTCHA in the browser for {source}; press Enter here when home/feed is visible.", flush=True)
    input()
    page.context.storage_state(path=str(state_path(source)))
    os.chmod(state_path(source), 0o600)
    print(json.dumps({"ok": True, "source": source, "state": str(state_path(source))}))


def visible_text(locator) -> str:
    try:
        return " ".join(locator.inner_text(timeout=1000).split())
    except Exception:
        return ""


def collect_x(page: Page) -> list[dict[str, str]]:
    page.goto(os.environ.get("X_MENTIONS_URL", f"https://x.com/{ACCOUNT}/mentions"), wait_until="domcontentloaded", timeout=45_000)
    page.wait_for_timeout(2500)
    result = []
    for article in page.locator('article[data-testid="tweet"]').all():
        text = visible_text(article.locator('[data-testid="tweetText"]'))
        links = article.locator('a[href*="/status/"]').all()
        href = links[0].get_attribute("href") if links else None
        if text and href:
            status_id = href.split("/status/", 1)[1].split("?", 1)[0].split("/", 1)[0]
            result.append({"source": "x", "sourceRef": status_id, "text": text})
    return result


def collect_instagram(page: Page) -> list[dict[str, str]]:
    page.goto(os.environ.get("INSTAGRAM_MENTIONS_URL", "https://www.instagram.com/"), wait_until="domcontentloaded", timeout=45_000)
    page.wait_for_timeout(2500)
    result = []
    for article in page.locator("article").all():
        text = visible_text(article)
        links = article.locator('a[href*="/p/"]').all()
        href = links[0].get_attribute("href") if links else None
        if text and href:
            shortcode = href.rstrip("/").split("/p/", 1)[1].split("/", 1)[0]
            result.append({"source": "instagram", "sourceRef": shortcode, "text": text})
    return result


def submit(item: dict[str, str]) -> int:
    require_env("COLLECTOR_API_KEY")
    payload = json.dumps(item).encode()
    request = Request(
        f"{API_URL}/api/collector/webhook",
        data=payload,
        headers={"content-type": "application/json", "x-api-key": API_KEY},
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            return response.status
    except (HTTPError, URLError) as error:
        print(f"submit failed source_ref={item.get('sourceRef')}: {error}", file=sys.stderr)
        return getattr(error, "code", 599)


def run_once(sources: list[str]) -> int:
    require_env("COLLECTOR_API_KEY")
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    total = 0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for source in sources:
                path = state_path(source)
                if not path.exists():
                    print(f"skip {source}: no session state; run --login {source}", file=sys.stderr)
                    continue
                context = browser.new_context(storage_state=str(path))
                page = context.new_page()
                try:
                    items = collect_x(page) if source == "x" else collect_instagram(page)
                    for item in items:
                        if submit(item) in (200, 201, 202):
                            total += 1
                finally:
                    context.close()
        finally:
            browser.close()
    print(json.dumps({"ok": True, "submitted": total, "account": ACCOUNT}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--login", choices=["x", "instagram"])
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--source", choices=["x", "instagram"], action="append")
    args = parser.parse_args()
    if args.login:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=False)
            context = browser.new_context()
            try:
                login(context.new_page(), args.login)
            finally:
                browser.close()
        return 0
    if args.once:
        return run_once(args.source or ["x", "instagram"])
    parser.error("use --login SOURCE or --once")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
