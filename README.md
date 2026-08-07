# SAMBAT

**Sistem Agen Masyarakat Banjarmasin Tanggap** — AI social-listening agent untuk Smart Governance.

AI agent yang mengubah mention warga menjadi kasus terstruktur, menggabungkan keluhan serupa, memprioritaskan secara transparan, dan mengawal respons pemerintah hingga penyelesaian dikonfirmasi warga.

> Banjarmasin Smart City Ideathon 2026 — Dimensi Smart Governance

## Struktur

```text
sambat/
├── apps/
│   ├── web/          # Next.js 15 — dashboard warga + dinas + publik
│   ├── api/          # Bun + Hono — REST API + worker (collector, SLA)
│   └── ai/           # FastAPI — normalizer Banjar, klasifikasi, embedding
├── packages/
│   └── shared/       # types + validation + kategori + SLA config
├── docker-compose.yml
└── PRD.md            # Product Requirements Document
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| UI | Next.js 15 (shadcn/ui, Lucide) |
| API + Worker | Bun + Hono |
| AI Service | FastAPI (IndoBERT/XLM-R) |
| Database | PostgreSQL 16 + PostGIS + pgvector |
| Queue | Redis + BullMQ |
| Scraper | Playwright (fallback) |
| Deploy | Docker Compose — 1 VPS |

## Dokumentasi

- [PRD](PRD.md) — Product Requirements Document lengkap
