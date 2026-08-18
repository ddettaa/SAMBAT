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
│   │   ├── database/        # migration + seeder (gaya Laravel)
│   │   │   ├── migrations/  # 101_extensions .. 111_create_audit_log
│   │   │   ├── seeders/     # 001_base.sql (dinas + geo_flood)
│   │   │   └── migrate.ts / seed.ts / reset.ts
│   │   └── .env             # API keys, DATABASE_URL, SLA config
│   ├── collector/    # Playwright — X & Instagram mention collector
│   │   ├── playwright_collector.py
│   │   ├── .env             # akun SAMBAT_BJM, session dir (ignored by Git)
│   │   └── .env.example
│   └── ai/           # FastAPI — normalizer Banjar, LLM classifier
│       ├── classifier.py    # LLM-first (9Router), rule-based fallback
│       ├── normalizer.py    # 3.078 entri kamus Banjar
│       └── .env             # LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
├── deploy/
│   ├── systemd/      # sambat-ai, sambat-api, sambat-worker, sambat-collector
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
| Collector | Python + Playwright (X & Instagram) |
| Deploy | systemd di VPS biasa (opsional untuk development) |

## Prasyarat

- [Bun](https://bun.sh) ≥ 1.3
- [Python](https://www.python.org) ≥ 3.10
- [PostgreSQL](https://www.postgresql.org) 14+ (dengan ekstensi PostGIS dan pg_trgm)
- [Git](https://git-scm.com)

## Setup

### 1. Clone repository

```bash
git clone https://github.com/ddettaa/SAMBAT.git
cd SAMBAT
```

### 2. Install PostgreSQL + PostGIS

Pilih sesuai OS kamu.

#### macOS (Homebrew)

```bash
brew install postgresql@16 postgis
brew services start postgresql@16
```

Buat user dan database:

```bash
createuser -s sambat
psql -d postgres -c "ALTER USER sambat PASSWORD 'sambat';"
createdb -O sambat sambat
psql -d sambat -c "CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm;"
```

#### Windows

1. Unduh installer dari <https://www.postgresql.org/download/windows/> (misal versi 16).
2. Jalankan installer, catat password superuser `postgres`.
3. Centang **Stack Builder** lalu install **PostGIS** bundle, atau unduh dari <https://postgis.net/install/>.
4. Buka **pgAdmin** / `psql` dan jalankan:

```sql
CREATE USER sambat WITH SUPERUSER PASSWORD 'sambat';
CREATE DATABASE sambat OWNER sambat;
\c sambat
CREATE EXTENSION postgis;
CREATE EXTENSION pg_trgm;
```

> Alternatif: pakai [Postgres.app](https://postgresapp.com) di macOS, atau jalankan Postgres via [Docker Desktop](https://www.docker.com/products/docker-desktop/) bila kamu suka.

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgresql-16-postgis-3
sudo -u postgres createuser -s sambat
sudo -u postgres psql -c "ALTER USER sambat PASSWORD 'sambat';"
sudo -u postgres createdb -O sambat sambat
sudo -u postgres psql -d sambat -c "CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm;"
```

#### Linux (Fedora/RHEL)

```bash
sudo dnf install postgresql-server postgresql-contrib postgis
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
sudo -u postgres createuser -s sambat
sudo -u postgres psql -c "ALTER USER sambat PASSWORD 'sambat';"
sudo -u postgres createdb -O sambat sambat
sudo -u postgres psql -d sambat -c "CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm;"
```

### 3. Setup environment

Semua secret disimpan di file `.env` lokal (di-ignore Git), bukan di source code.

#### AI service

```bash
cd apps/ai
python3 -m venv .venv && source .venv/bin/activate   # macOS/Linux
# Windows: python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Isi `.env`:

```env
LLM_BASE_URL=https://your-llm-provider.example/v1
LLM_API_KEY=your-api-key
LLM_MODEL=btlbagus
ALLOW_INSECURE_LLM=true
```

> `ALLOW_INSECURE_LLM=true` hanya untuk provider LLM yang masih HTTP. Untuk produksi gunakan HTTPS.

#### API service

```bash
cd ../api
bun install
cp .env.example .env
```

Isi `.env`:

```env
PORT=3001
DATABASE_URL=postgres://sambat:sambat@localhost:5432/sambat
AI_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
OPERATOR_API_KEY=generate-a-random-secret
COLLECTOR_API_KEY=generate-a-random-secret
DINAS_API_KEY=generate-a-random-secret
```

> Key di `apps/api/.env` otomatis di-bootstrap ke tabel `api_keys` saat API pertama kali jalan (hash SHA-256, bukan plaintext).

### 4. Jalankan migrasi dan seeder

```bash
cd apps/api
bun run db:migrate    # jalankan migration (gaya Laravel)
bun run db:seed       # isi data awal (dinas + geo_flood)
```

Opsional — sinkronisasi data Geoportal Banjarmasin (batas kelurahan + risiko banjir BPBD):

```bash
bun run geo:sync
```

### 5. Jalankan service (development)

Gunakan 2 terminal.

Terminal 1 — AI service:

```bash
cd apps/ai
source .venv/bin/activate       # Windows: .venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Terminal 2 — API service:

```bash
cd apps/api
bun run dev                     # http://localhost:3001
```

Worker SLA (jalankan di terminal 3 atau via cron):

```bash
cd apps/api
bun run worker
```

Verifikasi:

```bash
curl http://localhost:8000/health
curl http://localhost:3001/api/health
```

### 6. Collector X & Instagram (opsional)

Engine: **CloakBrowser** — Chromium stealth dengan patch level C++ (drop-in Playwright
replacement) + **profile persisten**: login sekali per akun, sesi bertahan antar-run
(cookies + localStorage tersimpan otomatis). Jika selector DOM berubah, AI fallback
opsional via [browser-use](https://github.com/browser-use/browser-use) mengambil alih
(self-healing).

```bash
cd apps/collector
python3 -m venv .venv && source .venv/bin/activate   # Windows: python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python -m cloakbrowser login   # opsional tapi disarankan — key gratis via sign-in GitHub (binary terbaru)
cp .env.example .env
```

Isi `.env`:

```env
SAMBAT_SOCIAL_ACCOUNT=sambatbjm
X_USERNAME=sambatbjm
X_PASSWORD=your-password
INSTAGRAM_USERNAME=sambatbjm
INSTAGRAM_PASSWORD=your-password
COLLECTOR_API_KEY=   # WAJIB — sama persis dengan COLLECTOR_API_KEY di apps/api/.env
```

Login sekali per akun (browser terbuka; selesaikan OTP/CAPTCHA bila diminta):

```bash
python playwright_collector.py --login x
python playwright_collector.py --login instagram
```

Polling manual:

```bash
python playwright_collector.py --once            # collect + submit ke API
python playwright_collector.py --once --dry-run  # kumpulkan tanpa submit (tanpa API key)
python playwright_collector.py --once --no-ai    # tanpa AI fallback
```

AI fallback (opsional) memakai LLM OpenAI-compatible:

```bash
pip install -r requirements-ai.txt   # browser-use
```

Set `BROWSER_USE_LLM_BASE_URL` / `BROWSER_USE_LLM_API_KEY` / `BROWSER_USE_LLM_MODEL` di `.env`,
atau biarkan kosong — otomatis jatuh ke `LLM_*` dari `apps/ai/.env`.

> Password tidak pernah masuk database/log. Sesi tersimpan di profile persisten
> (`SESSION_DIR`, default otomatis per-OS) plus backup portabel `{source}-state.json`
> dengan permission 600. Kunci anti-duplikasi adalah `sourceRef` (ID tweet /
> shortcode IG) — divalidasi regex `^[A-Za-z0-9_-]+$` di kedua sisi sebelum masuk
> `collector_inbox`.

### 7. Production (Linux / VPS)

Jalankan sebagai service systemd:

```bash
sudo bash deploy/install-systemd.sh
```

Ini akan mengaktifkan:

```text
sambat-ai.service        # uvicorn AI di :8000
sambat-api.service       # API Bun di :3001
sambat-worker.timer      # SLA worker tiap 1 menit
sambat-collector.timer   # collector tiap 5 menit
```

Cek status:

```bash
systemctl status sambat-ai sambat-api sambat-worker.timer sambat-collector.timer
journalctl -u sambat-api -n 50
```

> systemd khusus Linux. Di macOS/Windows untuk production cukup jalankan service dengan `bun run start` + `uvicorn` dan jadwalkan worker via `cron`/Task Scheduler.

## Testing

```bash
# API (butuh DB test terpisah)
cd apps/api
DATABASE_URL=postgres://sambat:sambat@localhost:5432/sambat_test bun run test:e2e
DATABASE_URL=postgres://sambat:sambat@localhost:5432/sambat_test bun run test:worker
DATABASE_URL=postgres://sambat:sambat@localhost:5432/sambat_test bun run test:geo

# AI
cd apps/ai
python3 test_ai.py
python3 test_security.py
```

## Dokumentasi

- [PRD](PRD.md) — Product Requirements Document lengkap
