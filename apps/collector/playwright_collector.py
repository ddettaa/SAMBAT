#!/usr/bin/env python3
"""SAMBAT social collector — CloakBrowser edition.

First run: python playwright_collector.py --login x
Polling:  python playwright_collector.py --once
Dry run:  python playwright_collector.py --once --dry-run

Engine: CloakBrowser — Chromium stealth dengan patch level C++ (drop-in
Playwright API). Sesi memakai profile persisten per-source: cookies +
localStorage bertahan antar-run, jadi cukup --login SEKALI per akun.
storage_state JSON tetap diekspor setelah login sebagai backup portabel.

Install: pip install -r requirements.txt
Disarankan: python -m cloakbrowser login   (key gratis via GitHub,
untuk selalu dapat binary stealth terbaru).
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from playwright.sync_api import Page  # tipe saja — objek asli dihasilkan cloakbrowser

try:
    from cloakbrowser import launch_persistent_context
except ImportError as error:  # hard dependency sejak engine CloakBrowser
    raise SystemExit(
        "cloakbrowser belum terpasang. Jalankan: pip install -r requirements.txt "
        "(lalu disarankan: python -m cloakbrowser login)"
    ) from error

SCRIPT_DIR = Path(__file__).resolve().parent


def load_dotenv(path: Path) -> None:
    """Minimal .env loader (zero-dependency). Real environment always wins."""
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'\"")
        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv(SCRIPT_DIR / ".env")
# Sekunder: fallback AI boleh memakai kredensial LLM dari apps/ai/.env (LLM_*)
# bila BROWSER_USE_* tidak diatur. Env yang sudah terisi tidak ditimpa.
load_dotenv(SCRIPT_DIR.parent / "ai" / ".env")


def default_session_dir() -> str:
    if os.name == "nt":  # Windows: %LOCALAPPDATA%\sambat\browser
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return str(Path(base) / "sambat" / "browser")
    return "/var/lib/sambat/browser"


# SESSION_DIR nama baru; PLAYWRIGHT_SESSION_DIR dihormati sebagai alias lama.
ROOT = Path(os.environ.get("SESSION_DIR") or os.environ.get("PLAYWRIGHT_SESSION_DIR") or default_session_dir())
API_URL = os.environ.get("SAMBAT_API_URL", "http://127.0.0.1:3001").rstrip("/")
API_KEY = os.environ.get("COLLECTOR_API_KEY", "")
ACCOUNT = os.environ.get("SAMBAT_SOCIAL_ACCOUNT", "SAMBAT_BJM").lstrip("@")

# Locale/timezone/viewport dibuat konsisten per-sesi. User-Agent sengaja TIDAK
# dioverride — binary cloak menjaga konsistensi UA ↔ client-hints di level C++;
# UA custom justru menciptakan fingerprint yang saling bertentangan.
CONTEXT_OPTS = {
    "locale": "id-ID",
    "timezone_id": "Asia/Makassar",  # WITA — Banjarmasin
    "viewport": {"width": 1280, "height": 900},
}

# X berganti DOM beberapa kali; coba selector lama & baru.
USERNAME_SELECTORS = ['input[name="username_or_email"]', 'input[autocomplete^="username"]', 'input[autocomplete="username"]']
PASSWORD_SELECTORS = ['input[name="password"]', 'input[type="password"]']
# Instagram kini memakai form ala Facebook: name="email" / name="pass".
IG_USERNAME_SELECTORS = ['input[name="username"]', 'input[name="email"]', 'input[autocomplete^="username"]']
IG_PASSWORD_SELECTORS = ['input[name="password"]', 'input[name="pass"]', 'input[type="password"]']


def first_visible(page: Page, selectors: list[str]):
    for sel in selectors:
        loc = page.locator(sel)
        if loc.count() and loc.first.is_visible():
            return loc.first
    return None


def profile_dir(source: str) -> Path:
    return ROOT / f"{source}-profile"


def state_path(source: str) -> Path:
    return ROOT / f"{source}-state.json"


def session_ctx(source: str, headless: bool, humanize: bool = False):
    """Context CloakBrowser persisten — cookies + localStorage bertahan antar-run."""
    return launch_persistent_context(
        str(profile_dir(source)),
        headless=headless,
        humanize=humanize,  # gerakan mouse/ketikan seperti manusia (dipakai saat --login)
        locale=CONTEXT_OPTS["locale"],
        timezone=CONTEXT_OPTS["timezone_id"],
        viewport=CONTEXT_OPTS["viewport"],
    )


def persistent_page(context) -> Page:
    return context.pages[0] if context.pages else context.new_page()


def secure(path: Path) -> None:
    with contextlib.suppress(OSError):
        os.chmod(path, 0o600)


def require_env(*names: str) -> None:
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise SystemExit(f"missing environment: {', '.join(missing)} (set them in {SCRIPT_DIR / '.env'})")


def looks_like_login(page: Page, source: str) -> bool:
    url = page.url.lower()
    if source == "x":
        if "/login" in url or "mode=login" in url:
            return True
        return page.locator('input[name="username_or_email"], input[autocomplete="username"]').count() > 0
    if "/accounts/login" in url or "accounts/login" in url:
        return True
    return page.locator('form[action*="login"], input[name="email"], input[name="username"]').count() > 0


def click_primary(page: Page) -> None:
    """Klik tombol submit utama (label beda-beda per bahasa/platform)."""
    for label in ("Log in", "Masuk", "Login", "Lanjutkan", "Sign in"):
        btn = page.locator(f'button:text-is("{label}")')
        if btn.count():
            btn.first.click()
            return
    page.keyboard.press("Enter")


def login(page: Page, source: str) -> None:
    """Login sekali; human melengkapi OTP/CAPTCHA bila diminta.

    Sesi tersimpan otomatis di profile persisten saat context ditutup,
    plus diekspor sebagai storage_state JSON (backup portabel).
    """
    username = os.environ.get(f"{source.upper()}_USERNAME", ACCOUNT)
    password = os.environ.get(f"{source.upper()}_PASSWORD", "")
    if source == "x":
        page.goto("https://x.com/i/flow/login", wait_until="domcontentloaded", timeout=45_000)
        page.wait_for_timeout(4000)  # form dirender via JS; beri waktu render
        user_field = first_visible(page, USERNAME_SELECTORS)
        if not user_field:
            print("x: kolom username tidak ditemukan — lanjutkan login manual di browser", file=sys.stderr)
        else:
            user_field.fill(username)
        pass_field = first_visible(page, PASSWORD_SELECTORS)
        if pass_field and password:  # form gabungan (DOM 2025+): username+password satu halaman
            pass_field.fill(password)
            click_primary(page)
        else:  # flow lama dua langkah: Enter setelah username, password muncul belakangan
            page.keyboard.press("Enter")
            page.wait_for_timeout(1500)
            pass_field = first_visible(page, PASSWORD_SELECTORS)
            if password and pass_field:
                pass_field.fill(password)
                page.keyboard.press("Enter")
    else:
        page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded", timeout=45_000)
        page.wait_for_timeout(3000)
        user_field = first_visible(page, IG_USERNAME_SELECTORS)
        pass_field = first_visible(page, IG_PASSWORD_SELECTORS)
        if not user_field:
            print("instagram: kolom username tidak ditemukan — lanjutkan login manual di browser", file=sys.stderr)
        elif password and pass_field:
            user_field.fill(username)
            pass_field.fill(password)
            click_primary(page)
        else:
            user_field.fill(username)
            page.keyboard.press("Enter")
    print(f"Complete any OTP/CAPTCHA in the browser for {source}; press Enter here when home/feed is visible.", flush=True)
    input()
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    page.context.storage_state(path=str(state_path(source)))  # backup portabel
    secure(state_path(source))
    print(json.dumps({"ok": True, "source": source, "profile": str(profile_dir(source)), "state": str(state_path(source))}))


def visible_text(locator) -> str:
    try:
        return " ".join(locator.inner_text(timeout=1000).split())
    except Exception:
        return ""


def ai_fallback(source: str) -> list[dict[str, str]] | None:
    """Self-healing fallback via browser-use (LLM agent) saat selector DOM berubah.

    Dependency opsional: pip install -r requirements-ai.txt
    Konfigurasi: BROWSER_USE_LLM_{BASE_URL,API_KEY,MODEL} — jatuh ke LLM_* apps/ai/.env.
    Return None bila fallback tidak tersedia/di-skip; list (mungkin kosong) bila dijalankan.
    """
    base_url = os.environ.get("BROWSER_USE_LLM_BASE_URL") or os.environ.get("LLM_BASE_URL")
    api_key = os.environ.get("BROWSER_USE_LLM_API_KEY") or os.environ.get("LLM_API_KEY")
    model = os.environ.get("BROWSER_USE_LLM_MODEL") or os.environ.get("LLM_MODEL")
    if not (base_url and api_key and model):
        print(f"{source}: AI fallback dilewati — BROWSER_USE_LLM_* / LLM_* tidak diatur", file=sys.stderr)
        return None
    try:
        import asyncio

        from browser_use import Agent, BrowserProfile, BrowserSession, ChatOpenAI
    except ImportError:
        print(f"{source}: AI fallback tidak tersedia — pip install -r requirements-ai.txt", file=sys.stderr)
        return None

    url = (
        os.environ.get("X_MENTIONS_URL", f"https://x.com/{ACCOUNT}/mentions")
        if source == "x"
        else os.environ.get("INSTAGRAM_MENTIONS_URL", "https://www.instagram.com/")
    )
    task = (
        f"Buka {url}. Sesi sudah login sebagai @{ACCOUNT}. "
        f"Ekstrak SEMUA post yang terlihat di halaman. "
        f"Balas HANYA array JSON tanpa penjelasan: "
        f'[{{"sourceRef": "<id unik post dari URLnya, angka untuk X / shortcode untuk Instagram>", '
        f'"text": "<teks lengkap post apa adanya>"}}]. '
        f"Jika halaman meminta login atau tidak ada post, balas []."
    )

    async def run_agent() -> str | None:
        state_file = state_path(source)
        profile = BrowserProfile(
            storage_state=str(state_file) if state_file.exists() else None,
            user_data_dir=None,  # pakai cookies dari storage_state saja (hindari warning dual-source)
            headless=True,
            viewport=CONTEXT_OPTS["viewport"],
            disable_security=True,
            keep_alive=False,
        )
        session = BrowserSession(browser_profile=profile)
        agent = Agent(
            task=task,
            llm=ChatOpenAI(model=model, base_url=base_url, api_key=api_key),
            browser_session=session,
            max_steps=int(os.environ.get("BROWSER_USE_MAX_STEPS", "12")),
        )
        try:
            history = await agent.run()
            return history.final_result()
        finally:
            await session.close()

    try:
        raw = asyncio.run(run_agent())
    except Exception as error:
        print(f"{source}: AI fallback gagal: {error}", file=sys.stderr)
        return None
    if not raw:
        return []
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("["), cleaned.rfind("]")
        if start == -1 or end == -1:
            print(f"{source}: AI fallback mengembalikan output non-JSON", file=sys.stderr)
            return None
        parsed = json.loads(cleaned[start : end + 1])
    result: list[dict[str, str]] = []
    for entry in parsed if isinstance(parsed, list) else []:
        ref = str(entry.get("sourceRef", "")).strip()[:255]
        text = str(entry.get("text", "")).strip()
        if ref and text and re.fullmatch(r"[A-Za-z0-9_-]+", ref):  # sama dengan validasi webhook API
            result.append({"source": source, "sourceRef": ref, "text": text})
    print(json.dumps({"source": source, "ai_fallback_items": len(result)}))
    return result


def collect_x(page: Page) -> list[dict[str, str]] | None:
    url = os.environ.get("X_MENTIONS_URL", f"https://x.com/{ACCOUNT}/mentions")
    page.goto(url, wait_until="domcontentloaded", timeout=45_000)
    page.wait_for_timeout(2500)
    if looks_like_login(page, "x"):
        print(f"x: session expired or logged out — run: python3 {Path(__file__).name} --login x", file=sys.stderr)
        return None
    result = []
    for article in page.locator('article[data-testid="tweet"]').all():
        text = visible_text(article.locator('[data-testid="tweetText"]'))
        links = article.locator('a[href*="/status/"]').all()
        href = links[0].get_attribute("href") if links else None
        if text and href:
            status_id = href.split("/status/", 1)[1].split("?", 1)[0].split("/", 1)[0]
            if status_id.isdigit():
                result.append({"source": "x", "sourceRef": status_id, "text": text})
    return result


def collect_instagram(page: Page) -> list[dict[str, str]] | None:
    url = os.environ.get("INSTAGRAM_MENTIONS_URL", "https://www.instagram.com/")
    page.goto(url, wait_until="domcontentloaded", timeout=45_000)
    page.wait_for_timeout(2500)
    if looks_like_login(page, "instagram"):
        print(f"instagram: session expired or logged out — run: python3 {Path(__file__).name} --login instagram", file=sys.stderr)
        return None
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


def run_once(sources: list[str], dry_run: bool = False, use_ai_fallback: bool = True) -> int:
    if not dry_run:
        require_env("COLLECTOR_API_KEY")
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    total = failed = 0
    collected: dict[str, dict[str, dict[str, str]]] = {}
    for source in sources:
        if not profile_dir(source).exists():
            print(f"skip {source}: belum ada profile sesi — jalankan --login {source} sekali", file=sys.stderr)
            continue
        items: list[dict[str, str]] | None = None
        context = session_ctx(source, headless=True)
        try:
            page = persistent_page(context)
            items = collect_x(page) if source == "x" else collect_instagram(page)
        finally:
            context.close()  # profile tersimpan otomatis — sesi bertahan untuk run berikutnya
        if items is None:
            continue  # session expired / diminta login ulang
        if not items and use_ai_fallback:
            # Selector utama tidak menemukan apa pun — kemungkinan DOM berubah.
            # Serahkan ke LLM agent (browser-use) sebagai self-healing fallback.
            print(f"{source}: 0 item via selector — mencoba AI fallback", file=sys.stderr)
            items = ai_fallback(source) or []
        if not items:
            continue
        unique: dict[str, dict[str, str]] = {}
        for item in items:
            if item["sourceRef"] not in unique:  # dedupe within a single batch
                unique[item["sourceRef"]] = item
        collected[source] = unique
        if dry_run:
            print(json.dumps({"source": source, "would_submit": len(unique)}, ensure_ascii=False))
            continue
        for item in unique.values():
            if submit(item) in (200, 201, 202):
                total += 1
            else:
                failed += 1
    print(json.dumps({
        "ok": failed == 0,
        "submitted": total,
        "failed": failed,
        "account": ACCOUNT,
        "backend": "cloakbrowser",
        "dry_run": dry_run,
        **{k: len(v) for k, v in collected.items()},
    }))
    return 0 if failed == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="SAMBAT X & Instagram mention collector (CloakBrowser)")
    parser.add_argument("--login", choices=["x", "instagram"], help="interactive login — sekali saja, sesi tersimpan permanen di profile")
    parser.add_argument("--once", action="store_true", help="collect mentions once and submit to the API")
    parser.add_argument("--source", choices=["x", "instagram"], action="append", help="restrict --once to specific source(s)")
    parser.add_argument("--dry-run", action="store_true", help="collect without submitting (no API key needed)")
    parser.add_argument("--no-ai", action="store_true", help="disable browser-use AI fallback")
    args = parser.parse_args()
    if args.login:
        ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
        context = session_ctx(args.login, headless=False, humanize=True)
        try:
            login(persistent_page(context), args.login)
        finally:
            context.close()
        return 0
    if args.once:
        return run_once(args.source or ["x", "instagram"], dry_run=args.dry_run, use_ai_fallback=not args.no_ai)
    parser.error("use --login SOURCE or --once [--dry-run] [--no-ai]")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
