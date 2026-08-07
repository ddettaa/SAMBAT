# SAMBAT — Product Requirements Document (PRD)

> **SAMBAT** — Sistem Agen Masyarakat Banjarmasin Tanggap
> AI social-listening agent yang mengubah mention warga menjadi kasus terstruktur, menggabungkan keluhan serupa, memprioritaskan secara transparan, dan mengawal respons pemerintah hingga penyelesaian dikonfirmasi warga.
>
> Kompetisi: Banjarmasin Smart City Ideathon 2026 (Kominfo)
> Dimensi: Smart Governance

---

## 1. Ringkasan Eksekutif

SAMBAT adalah AI agent yang memantau kanal sosial (X, Instagram, WhatsApp, form web) untuk mendeteksi keluhan warga, mengubahnya menjadi laporan terstruktur, menggabungkan laporan duplikat menjadi satu kasus kolektif, menghitung prioritas secara transparan, meneruskan ke dinas terkait, dan mengawal SLA hingga warga mengonfirmasi penyelesaian.

**Posisi:** Bukan kotak pengaduan digital. SAMBAT mendengar keluhan di kanal yang sudah dipakai warga, menyatukan suara yang sama menjadi prioritas kota, dan mengawal responsnya sampai dikonfirmasi.

---

## 2. Masalah

| Aspek | Detail |
|---|---|
| **Pengaduan tersebar** | Keluhan warga tersebar di medsos, WA, dan obrolan RT/RW — tidak ada satu pintu masuk |
| **Duplikasi** | Masalah yang sama dilaporkan berkali-kali oleh warga berbeda, tidak pernah diakumulasi |
| **Tidak ada prioritas** | Dinas menerima laporan satu per satu tanpa ukuran urgensi/dampak |
| **Tidak transparan** | Warga tidak tahu status laporannya; dinas tidak memiliki tekanan publik untuk responsif |
| **Bahasa** | Banyak warga (terutama lansia) menulis dalam Bahasa Banjar — sistem umum tidak memahaminya |

---

## 3. Solusi

### 3.1 Alur Inti

```
Warga kirim keluhan (mention/DM/form teks)
  → Collector Worker (X, Instagram, WA, Form)
  → Preprocessor (bersihkan + filter spam)
  → Normalizer Banjar (kamus 3.078 entri → Indonesia)
  → Klasifikasi kategori (IndoBERT/XLM-R)
  → Ekstraksi lokasi (rule-based + LLM)
  → Deduplikasi (semantic similarity + PostGIS radius)
  → Skor prioritas (formula transparan)
  → Verifikasi (confidence ≥80% auto / <80% operator)
  → Tiket laporan (SLA countdown)
  → Routing ke dinas (PUPR, DLH, Dishub, BPBD)
  → Dinas kerjakan (reminder + eskalasi berjenjang)
  → Balasan otomatis ke warga (nomor tiket + status)
  → Konfirmasi warga → SELESAI
  → Dashboard publik (transparansi)
```

### 3.2 Fitur Utama (MVP)

| # | Fitur | Prioritas |
|---|---|---|
| F1 | Intake mention X + Instagram + WA teks + form web | P0 |
| F2 | Normalizer Bahasa Banjar → Indonesia (kamus 3.078 entri) | P0 |
| F3 | Klasifikasi kategori: sampah, drainase, jalan rusak, lampu jalan | P0 |
| F4 | Ekstraksi lokasi (nama jalan/kelurahan) | P0 |
| F5 | Deduplikasi laporan serupa → kasus kolektif | P0 |
| F6 | Skor prioritas transparan (formula publik) | P0 |
| F7 | Tiket + SLA countdown per dinas | P0 |
| F8 | Balasan otomatis dengan nomor tiket + status | P0 |
| F9 | Dashboard operator (review <80% confidence) | P1 |
| F10 | Dashboard publik transparansi | P1 |
| F11 | SLA reminder + eskalasi berjenjang | P1 |
| F12 | Konfirmasi warga untuk menutup kasus | P1 |
| F13 | Playwright fallback collector untuk halaman publik non-API | P2 |
| F14 | Peta sebaran laporan (Leaflet + OSM) | P2 |

### 3.3 Kategori Awal

1. **Sampah** — penumpukan, pembuangan liar, TPS penuh
2. **Drainase/Banjir** — selokan mampet, genangan, air naik
3. **Jalan rusak** — lubang, aspal pecah, jembatan
4. **Lampu jalan** — PJU padam, gelap, rusak
5. **Lainnya** — diteruskan ke operator untuk dikategorikan manual

### 3.4 Formula Prioritas

```
P = 30U + 25D + 20V + 15T + 10R
```

| Variabel | Bobot | Arti |
|---|---|---|
| U | 30 | Urgensi / risiko keselamatan |
| D | 25 | Jumlah laporan serupa (duplikat) |
| V | 20 | Kekuatan bukti & kelengkapan lokasi |
| T | 15 | Lama masalah belum ditangani |
| R | 10 | Dampak / radius warga terdampak |

Skor 0–100, tampil transparan di dashboard beserta rincian tiap komponen.

### 3.5 SLA & Eskalasi

| Level | Status | Tindakan |
|---|---|---|
| L1 | Diterima | Balasan otomatis + nomor tiket |
| L2 | Dikerjakan | Dinas update progres |
| L3 | Mendekati deadline | Reminder otomatis H-1 |
| L4 | Terlambat | Eskalasi berjenjang: kelurahan → dinas → walikota |
| L5 | Selesai | Konfirmasi warga → tutup kasus |

Eskalasi publik melewati moderasi operator — tidak ada tuduhan otomatis terhadap individu/dinas.

### 3.6 Batas Peran AI

**AI boleh otomatis:** baca & kelompokkan laporan, deteksi duplikasi, sarankan kategori & prioritas, buat tiket, kirim reminder SLA, ringkas laporan.

**AI tidak boleh otomatis:** menuduh individu/dinas, menampilkan identitas warga, menutup laporan tanpa konfirmasi, menghapus laporan kritis, memublikasikan konten sensitif tanpa moderasi.

---

## 4. Arsitektur

### 4.1 Tech Stack

| Layer | Teknologi |
|---|---|
| UI | Next.js 15 (App Router, shadcn/ui, Lucide icons) |
| API + Worker | Bun + Hono (collector, SLA reminder, dedup query) |
| AI Service | FastAPI (normalizer Banjar + IndoBERT/XLM-R + semantic dedup) |
| Database | PostgreSQL 16 + PostGIS + pgvector |
| Queue | Redis + BullMQ |
| Scraper | Playwright (fallback saja) |
| Auth | NextAuth (warga: OTP/Google, dinas: email+password) |
| Peta | Leaflet + OpenStreetMap |
| Deploy | Docker Compose — 1 VPS |

### 4.2 Repository Layout

```text
sambat/
├── apps/
│   ├── web/          # Next.js — dashboard warga + dinas + publik
│   ├── api/          # Bun + Hono — REST API + worker (collector, SLA)
│   └── ai/           # FastAPI — normalizer, klasifikasi, embedding
├── packages/
│   └── shared/       # types + validation (Zod) + kategori + SLA config
├── docker-compose.yml
└── PRD.md
```

### 4.3 Database (PostgreSQL)

Tabel inti:

| Tabel | Isi |
|---|---|
| `reports` | Laporan terindeks (id, source, text_original, text_normalized, category, location, geom, priority, status, sla_due) |
| `cases` | Kasus kolektif hasil deduplikasi (report_ids[], score, radius) |
| `users` | Warga + dinas + operator (role, dinas_id) |
| `dinas` | Dinas tujuan routing (PUPR, DLH, Dishub, BPBD) |
| `sla_events` | Timeline SLA (status, timestamp, actor) |
| `audit_log` | Jejak semua aksi AI & operator |

Index penting: `GIST(geom)` untuk radius, `pg_trgm` untuk text similarity, `pgvector` untuk embedding semantic.

---

## 5. API (Ringkas)

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/reports` | Terima laporan baru (dari collector) |
| GET | `/api/reports` | List laporan (filter: category, status, dinas) |
| GET | `/api/reports/:id` | Detail laporan + timeline |
| POST | `/api/reports/:id/status` | Update status (operator/dinas) |
| POST | `/api/reports/:id/confirm` | Konfirmasi warga → SELESAI |
| GET | `/api/cases` | Kasus kolektif + skor prioritas |
| POST | `/api/cases/:id/route` | Routing ke dinas (auto/manual) |
| GET | `/api/dashboard/public` | Statistik publik (per kategori, per kelurahan) |
| GET | `/api/dashboard/operator` | Antrian review confidence <80% |
| GET | `/api/health` | Health check |

Auth: Bearer key per role (warga/dinas/operator). Web proxy Next.js menyuntikkan kredensial server-side.

---

## 6. Roadmap 6 Bulan

| Bulan | Target |
|---|---|
| 1 | Riset warga, kategori masalah, SOP, kerja sama 2 dinas |
| 2 | Intake WhatsApp + form, dashboard, tiket, audit log |
| 3 | Normalizer Banjar, klasifikasi AI, ekstraksi lokasi |
| 4 | Deduplikasi, prioritas transparan, SLA reminder |
| 5 | Integrasi akun medsos resmi, pilot 2 kelurahan |
| 6 | Evaluasi dampak, perbaikan model, perluasan kategori |

**Target pilot:** 2 kelurahan, 2 dinas, 4 kategori, WhatsApp + 1 akun Instagram resmi.

---

## 7. Keberhasilan (Metrics)

| Metrik | Target |
|---|---|
| Waktu deteksi → tiket | < 5 menit |
| Akurasi klasifikasi kategori | ≥ 85% |
| Laporan duplikat tergabung | ≥ 60% |
| Laporan berespons ≤ SLA | ≥ 80% |
| Warga konfirmasi penyelesaian | ≥ 70% |
| Waktu rata-rata penyelesaian | Turun 30% vs baseline manual |

---

## 8. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Akses API medsos ditolak | Kanal WA + form web sebagai tulang punggung; medsos opsional |
| Data latih Banjar sedikit | Kamus 3.078 entri + augmentation; XLM-R multilingual |
| Dinas tidak responsif | SLA publik + eskalasi berjenjang + dashboard transparansi |
| Hoax / laporan palsu | Verifikasi operator <80% confidence, jejak metadata, konfirmasi warga |
| Privasi warga | Pseudonimisasi reporter, tanpa identitas di dashboard publik |
| Skalabilitas | Monolith + Postgres dulu; pisah service saat volume tumbuh |

---

## 9. Referensi

- Kamus Bahasa Banjar (ISBN 978-979-685-776-0) — sumber normalizer
- Template Proposal Banjarmasin Smart City Ideathon 2026
- Panduan Peserta Banjarmasin Smart City Ideathon 2026
