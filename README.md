# SAMBAT
Sistem Agen Masyarakat Banjarmasin Tanggap — AI social-listening agent untuk Smart Governance.

AI agent yang mengubah mention warga menjadi kasus terstruktur, menggabungkan keluhan serupa, memprioritaskan secara transparan, dan mengawal respons pemerintah hingga penyelesaian dikonfirmasi warga.

> Banjarmasin Smart City Ideathon 2026 — Dimensi Smart Governance

## Struktur

```text
sambat/
├── apps/
│   ├── api/          # Bun + Hono — REST API
│   │   ├── src/
│   │   │   ├── index.ts     # routes + state machine + dedup
│   │   │   ├── db.ts        # PostgreSQL + PostGIS migration
│   │   │   ├── auth.ts      # role-based API key auth
│   │   │   ├── config.ts    # SMART priority + pilot config
│   │   │   └── worker.ts    # SLA reminder + escalation
│   │   └── .env             # API keys, DATABASE_URL, SLA config
│   └── ai/           # FastAPI — normalizer Banjar, LLM classifier
│       ├── classifier.py    # LLM-first (9Router), rule-based fallback
│       ├── normalizer.py    # 3.078 entri kamus Banjar
│       └── .env             # LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
├── deploy/
│   ├── systemd/      # sambat-ai, sambat-api, sambat-worker (.service + .timer)
│   └── install-systemd.sh
└── PRD.md
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| UI | Next.js 15 (shadcn/ui, Lucide) |
| API + Worker | Bun + Hono |
| AI Service | FastAPI + LLM (9Router/btlbagus) + rule-based fallback |
| Database | PostgreSQL 16 + PostGIS + pg_trgm |
| Deploy | systemd di VPS biasa |

## Setup

```bash
# 1. PostgreSQL + PostGIS
sudo apt install postgresql-16 postgresql-16-postgis-3
sudo -u postgres createuser -s sambat
sudo -u postgres psql -c "ALTER USER sambat PASSWORD 'sambat';"
sudo -u postgres createdb -O sambat sambat
sudo -u postgres psql -d sambat -c "CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm;"

# 2. AI service
cd apps/ai && pip install -r requirements.txt
cp .env.example .env   # isi LLM_BASE_URL, LLM_API_KEY, LLM_MODEL

# 3. API
cd apps/api && bun install
cp .env.example .env   # isi API keys, DATABASE_URL

# 4. Deploy via systemd
cd ../.. && sudo bash deploy/install-systemd.sh
```

## Dokumentasi

- [PRD](PRD.md) — Product Requirements Document lengkap
