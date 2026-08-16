/**
 * SAMBAT Demo Seeder — semua data lewat pipeline database asli.
 *
 * Setiap laporan dibuat melalui intake() yang menjalankan:
 *   AI classify + normalize Banjar + PostGIS spatial join (kelurahan/kecamatan/flood)
 *   + SMART priority + pgvector embedding + dedup/case merge + auto-route.
 *
 * Kemudian sebagian status dinaikkan via SQL UPDATE untuk mensimulasikan
 * siklus hidup penuh: terdeteksi → diteruskan → dikerjakan → selesai.
 *
 * Jalankan: bun run db:seed-demo
 */

import { sql, id } from "../src/db";
import { intake } from "../src/intake";
import { main as migrate } from "./migrate";

// Foto referensi Unsplash untuk demo (bukti visual)
const PHOTOS = {
  sampah: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600",
  jalan: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600",
  lampu: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=600",
  drainase: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600",
  sampahAfter: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=600",
  jalanAfter: "https://images.unsplash.com/photo-1533563906091-fdfdffc3e3c4?q=80&w=600",
  lampuAfter: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600",
  drainaseAfter: "https://images.unsplash.com/photo-1595841696660-1d965503a552?q=80&w=600",
};

interface SeedReport {
  text: string;
  source: string;
  sourceRef?: string;
  lat: number;
  lng: number;
  pseudo: string;
  imageBefore?: string;
  advanceTo?: "diteruskan" | "dikerjakan" | "selesai";
  imageAfter?: string;
  backdateDays?: number;
}

// ─── Data laporan demo — koordinat asli kelurahan Banjarmasin ───
const REPORTS: SeedReport[] = [
  // 1. AUTO-ROUTED: PJU mati (DISHUB) — tetap diteruskan (tugas baru)
  {
    text: "Lampu PJU mati total di Jalan A. Yani KM 5, sudah 3 malam gelap gulita berbahaya untuk motor",
    source: "x", sourceRef: "1800123456789012345",
    lat: -3.3275, lng: 114.5970,
    pseudo: "warga_ayani",
    imageBefore: PHOTOS.lampu,
    advanceTo: undefined, // biarkan auto-route yang kerjakan
  },
  // 2. AUTO-ROUTED + SELESAI: Sampah TPS (DLH)
  {
    text: "Ada tumpukan sampah besar di dekat TPS Basirih, bau busuk sekali sudah seminggu tidak diangkut",
    source: "web",
    lat: -3.3450, lng: 114.5850,
    pseudo: "Warga Basirih",
    imageBefore: PHOTOS.sampah,
    advanceTo: "selesai",
    imageAfter: PHOTOS.sampahAfter,
  },
  // 3. AUTO-ROUTED + DIKERJAKAN: Jalan Veteran (PUPR)
  {
    text: "Jalan Veteran lubangnya makin parah dan dalam, bahaya buat motor malam-malam",
    source: "web",
    lat: -3.3210, lng: 114.5920,
    pseudo: "Pengendara Veteran",
    imageBefore: PHOTOS.jalan,
    advanceTo: "dikerjakan",
  },
  // 4. AUTO-ROUTED: Drainase S. Parman (PUPR) — tugas baru
  {
    text: "Selokan di Jalan S. Parman mampet total, mun hujan lebat banyu naik ka dalam rumah",
    source: "x", sourceRef: "1800223456789012345",
    lat: -3.3420, lng: 114.5830,
    pseudo: "ulun_banjar",
    imageBefore: PHOTOS.drainase,
  },
  // 5-7. DUPLICATES: Jalan Belitung Darat (3 laporan serupa → case merge)
  {
    text: "Jalanan berlubang di Jalan Belitung Darat dekat simpang, lubangnya dalam sekali",
    source: "x", sourceRef: "1800323456789012345",
    lat: -3.3150, lng: 114.5780,
    pseudo: "Warga A Belitung",
    imageBefore: PHOTOS.jalan,
  },
  {
    text: "ada lubang besar membahayakan di jl belitung darat, sudah lama tidak ditambal",
    source: "instagram", sourceRef: "CxLm2pKv9rT",
    lat: -3.3155, lng: 114.5782,
    pseudo: "Warga B Belitung",
  },
  {
    text: "Belitung darat jalannya rusak parah tolong ditambal, banyak motor jatuh",
    source: "whatsapp",
    lat: -3.3148, lng: 114.5778,
    pseudo: "Warga C Belitung",
  },
  // 8. LOW CONFIDENCE: ambigu — tetap terdeteksi untuk operator
  {
    text: "Ada masalah lingkungan yang kurang mengenakkan di daerah ini, tolong dicek",
    source: "whatsapp",
    lat: -3.3320, lng: 114.5950,
    pseudo: "Anonim",
  },
  // 9. SELESAI: PJU Mantuil (DISHUB) — untuk leaderboard
  {
    text: "PJU padam total di sekitar jembatan Mantuil, gelap sekali kalau malam",
    source: "x", sourceRef: "1800423456789012345",
    lat: -3.3550, lng: 114.6020,
    pseudo: "mantuil_bjm",
    imageBefore: PHOTOS.lampu,
    advanceTo: "selesai",
    imageAfter: PHOTOS.lampuAfter,
  },
  // 10. SELESAI: Drainase Kelayan (PUPR)
  {
    text: "Parit di Kelayan Barat penuh lumpur, air kada kawa turun sama sekali",
    source: "instagram", sourceRef: "DxRm4kLv2wY",
    lat: -3.3380, lng: 114.5880,
    pseudo: "kelayan_barat",
    imageBefore: PHOTOS.drainase,
    advanceTo: "selesai",
    imageAfter: PHOTOS.drainaseAfter,
  },
  // 11. SELESAI: Sampah Pasar Lama (DLH)
  {
    text: "Sampah berserakan di sekitar Pasar Lama, bau dan kotor sekali",
    source: "web",
    lat: -3.3180, lng: 114.5940,
    pseudo: "Warga Pasar Lama",
    imageBefore: PHOTOS.sampah,
    advanceTo: "selesai",
    imageAfter: PHOTOS.sampahAfter,
  },
  // 12. DIKERJAKAN: Jalan Sungai Jingah (PUPR)
  {
    text: "Aspal Jalan Sungai Jingah pecah banyak, mohon segera ditangani",
    source: "web",
    lat: -3.3160, lng: 114.5990,
    pseudo: "Warga Sungai Jingah",
    imageBefore: PHOTOS.jalan,
    advanceTo: "dikerjakan",
  },
  // 13. OVERDUE SLA: PJU Pramuka — SLA terlewat 2 hari (untuk demo eskalasi)
  {
    text: "Lampu jalan mati dekat simpang empat Pramuka, sudah berhari-hari",
    source: "x", sourceRef: "1800523456789012345",
    lat: -3.3280, lng: 114.6150,
    pseudo: "Warga Pramuka",
    imageBefore: PHOTOS.lampu,
    advanceTo: "diteruskan",
    backdateDays: 3,
  },
  // 14. BANJAR LANGUAGE: Genangan Teluk Dalam
  {
    text: "Imbah hujan, banyu kada turun di kelurahan Teluk Dalam, genangan sampai lutut",
    source: "instagram", sourceRef: "ExYm6pMv3xZ",
    lat: -3.3260, lng: 114.5800,
    pseudo: "teluk_dalam_bjm",
    imageBefore: PHOTOS.drainase,
  },
];

async function seedDemo() {
  console.log("Migrating database...");
  await migrate();

  // ─── 1. Reset tabel runtime ───
  console.log("Clearing runtime tables...");
  await sql`TRUNCATE TABLE notifications, sla_events, cases, reports, collector_inbox, audit_log CASCADE`;

  // ─── 2. Pastikan base seeder sudah jalan (dinas + geo_flood) ───
  console.log("Ensuring base data (dinas + geo_flood)...");
  await sql`
    INSERT INTO dinas (id, name, short) VALUES
      ('d-pupr', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'PUPR'),
      ('d-dlh', 'Dinas Lingkungan Hidup', 'DLH'),
      ('d-dishub', 'Dinas Perhubungan', 'DISHUB'),
      ('d-bpbd', 'Badan Penanggulangan Bencana Daerah', 'BPBD')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short
  `;

  // ─── 3. Buat semua laporan melalui intake() — pipeline asli ───
  console.log(`Creating ${REPORTS.length} reports through intake pipeline...`);
  console.log("(AI classify + PostGIS + SMART + pgvector + auto-route + dedup)\n");

  const created: { id: string; advanceTo?: string; imageAfter?: string; backdateDays?: number }[] = [];

  for (const r of REPORTS) {
    try {
      const result = await intake(
        {
          text: r.text,
          source: r.source,
          sourceRef: r.sourceRef,
          latitude: r.lat,
          longitude: r.lng,
          reporterPseudo: r.pseudo,
          imageBefore: r.imageBefore || undefined,
        },
        "system-seeder"
      );

      if (result.ok) {
        const cat = result.report.category;
        const conf = result.report.confidence;
        const status = result.report.status;
        const dinas = result.report.dinas_id || "—";
        const ai = result.report.ai_used ? "LLM" : "rule";
        console.log(
          `  ✓ ${result.report.id} [${cat}] conf=${(conf * 100).toFixed(0)}% (${ai}) → ${status} → ${dinas}`
        );
        created.push({
          id: result.report.id,
          advanceTo: r.advanceTo,
          imageAfter: r.imageAfter,
          backdateDays: r.backdateDays,
        });
      } else {
        console.error(`  ✗ FAILED: ${r.text.slice(0, 40)}... — ${result.error}`);
      }
    } catch (e: any) {
      console.error(`  ✗ ERROR: ${r.text.slice(0, 40)}... — ${e.message}`);
    }
  }

  // ─── 4. Advance status untuk simulasi siklus hidup ───
  console.log("\nAdvancing report lifecycle...");

  for (const c of created) {
    if (!c.advanceTo) continue;

    const now = new Date();
    const reportTime = c.backdateDays
      ? new Date(now.getTime() - c.backdateDays * 24 * 3600 * 1000)
      : now;

    if (c.advanceTo === "diteruskan" && c.backdateDays) {
      // Overdue SLA: backdate + set SLA due di masa lalu
      const slaDue = new Date(now.getTime() - (c.backdateDays - 1) * 24 * 3600 * 1000);
      await sql`
        UPDATE reports
        SET created_at = ${reportTime.toISOString()},
            sla_due = ${slaDue.toISOString()},
            status = 'diteruskan'
        WHERE id = ${c.id}
      `;
      await sql`
        INSERT INTO sla_events (id, report_id, status, note, actor, created_at)
        VALUES (${id("sla")}, ${c.id}, 'diteruskan', ${`routed for SLA test (backdated ${c.backdateDays} days)`}, 'seeder', ${reportTime.toISOString()})
      `;
      console.log(`  → ${c.id}: backdated ${c.backdateDays}d, SLA overdue`);
    }

    if (c.advanceTo === "dikerjakan") {
      await sql`
        UPDATE reports SET status = 'dikerjakan', updated_at = now()
        WHERE id = ${c.id}
      `;
      await sql`
        INSERT INTO sla_events (id, report_id, status, note, actor)
        VALUES (${id("sla")}, ${c.id}, 'dikerjakan', 'dikerjakan oleh dinas (seeder)', 'seeder')
      `;
      console.log(`  → ${c.id}: dikerjakan`);
    }

    if (c.advanceTo === "selesai") {
      // Ambil koordinat laporan via PostGIS ST_Y/ST_X, tambah offset kecil
      const [rep] = await sql`SELECT ST_Y(geom)::float AS lat, ST_X(geom)::float AS lng FROM reports WHERE id = ${c.id}`;
      const rLat = rep?.lat ? Number(rep.lat) + 0.0005 : null;
      const rLng = rep?.lng ? Number(rep.lng) + 0.0003 : null;
      await sql`
        UPDATE reports
        SET status = 'selesai',
            image_after = ${c.imageAfter || null},
            repair_lat = ${rLat},
            repair_lng = ${rLng},
            updated_at = now()
        WHERE id = ${c.id}
      `;
      await sql`
        INSERT INTO sla_events (id, report_id, status, note, actor)
        VALUES (${id("sla")}, ${c.id}, 'selesai', 'diselesaikan oleh dinas (seeder)', 'seeder')
      `;
      console.log(`  → ${c.id}: selesai + foto + koordinat perbaikan`);
    }
  }

  // ─── 5. Summary ───
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM reports`;
  const [{ cases }] = await sql`SELECT count(*)::int AS cases FROM cases`;
  const byStatus = await sql`
    SELECT status, count(*)::int AS c FROM reports GROUP BY status ORDER BY c DESC
  `;
  const byDinas = await sql`
    SELECT dinas_id, count(*)::int AS c FROM reports WHERE dinas_id IS NOT NULL GROUP BY dinas_id
  `;

  console.log("\n═════════════════════════════════════════");
  console.log("  SEEDER SELESAI — semua via pipeline asli");
  console.log("═════════════════════════════════════════");
  console.log(`  Total laporan : ${total}`);
  console.log(`  Kasus kolektif: ${cases}`);
  console.log("\n  Status:");
  byStatus.forEach((s: any) => console.log(`    ${s.status.padEnd(20)} ${s.c}`));
  console.log("\n  Per dinas:");
  byDinas.forEach((d: any) => console.log(`    ${d.dinas_id.padEnd(12)} ${d.c}`));
  console.log("═════════════════════════════════════════\n");
}

if (import.meta.main) {
  await seedDemo();
  await sql.close();
}

export { seedDemo };
