"use strict";

const $ = (id) => document.getElementById(id);
const WEIGHTS = { U: 0.30, D: 0.25, V: 0.20, T: 0.15, R: 0.10 };
const CRITERIA = {
  U: "Urgensi keselamatan",
  D: "Jumlah laporan serupa",
  V: "Kelengkapan bukti & lokasi",
  T: "Lama tidak ditangani",
  R: "Risiko wilayah (banjir)",
};
const SAMPLES = [
  "lampu jalan di muka rumah ulun mati sudah saminggu, gelap banar",
  "sampah tumpuk di higa jambat, kada ada urang bacari sudah tiga hari",
  "banyu naik sampai dalam rumah, banar banjir di Basirih",
  "jalan bulubang halus tapi dalam, tiap hari ada motor tasarungsung",
  "parit buntu, bau busuk, guring kada nyaman",
];

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function setStatus(message, kind) {
  const el = $("status");
  el.textContent = message;
  el.className = kind ? `status status--${kind}` : "status";
}

function renderSmart(detail) {
  const body = $("r-smart");
  body.innerHTML = "";
  if (!detail || !detail.inputs) {
    body.innerHTML = '<tr><td colspan="4">Tidak tersedia</td></tr>';
    return;
  }
  for (const key of ["U", "D", "V", "T", "R"]) {
    const value = Number(detail.inputs[key] ?? 0);
    const contribution = Number(detail.components?.[key] ?? value * WEIGHTS[key]);
    body.insertAdjacentHTML("beforeend",
      `<tr><td>${CRITERIA[key]} <strong>(${key})</strong></td><td>${value.toFixed(0)}</td>` +
      `<td>${WEIGHTS[key].toFixed(2)}</td><td>${contribution.toFixed(1)}</td></tr>`);
  }
  $("r-method").textContent = detail.method || "";
}

function renderResult(data) {
  $("r-category").textContent = data.category || "—";
  $("r-confidence").textContent =
    data.confidence == null ? "—" : `${Math.round(Number(data.confidence) * 100)}%`;
  $("r-priority").textContent = data.priority == null ? "—" : `${data.priority} / 100`;
  $("r-status").textContent = data.status || "—";
  $("r-kelurahan").textContent = data.kelurahan || "—";
  $("r-kecamatan").textContent = data.kecamatan || "—";
  $("r-flood").textContent = data.flood_urgency == null ? "—" : `${data.flood_urgency} / 10`;
  $("r-engine").textContent = data.ai_used ? "Model LLM" : "Aturan cadangan";
  $("r-normalized").textContent = data.normalized || "—";
  $("r-reasoning").textContent = data.reasoning || "Tidak ada penjelasan dari model.";
  renderSmart(data.priority_detail);

  const section = $("result");
  section.hidden = false;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadStats() {
  try {
    const [dashboard, geo] = await Promise.all([
      fetch("/api/dashboard/public").then((r) => r.json()),
      fetch("/api/geo/summary").then((r) => r.json()).catch(() => null),
    ]);
    $("s-total").textContent = dashboard.total ?? 0;
    $("s-open").textContent = dashboard.open ?? 0;

    const kelurahan = geo?.admins?.find((a) => a.kind === "kelurahan")?.c;
    $("s-kel").textContent = kelurahan ?? "—";
    $("s-flood").textContent = geo?.flood?.[0]?.c ?? "—";

    const rows = (dashboard.recent || []).slice(0, 10);
    $("s-recent").innerHTML = rows.length
      ? rows.map((r) => {
          const when = new Date(r.created_at).toLocaleString("id-ID",
            { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
          return `<tr><td>${escapeHtml(when)}</td><td>${escapeHtml(r.category)}</td>` +
                 `<td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.priority)}</td></tr>`;
        }).join("")
      : '<tr><td colspan="4">Belum ada laporan.</td></tr>';
  } catch {
    $("s-recent").innerHTML = '<tr><td colspan="4">Statistik tidak dapat dimuat.</td></tr>';
  }
}

$("sample").addEventListener("click", () => {
  $("text").value = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  $("text").focus();
});

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = $("text").value.trim();
  if (text.length < 3) {
    setStatus("Keluhan minimal 3 karakter.", "err");
    return;
  }

  const payload = { text };
  const lat = parseFloat($("lat").value);
  const lng = parseFloat($("lng").value);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    payload.latitude = lat;
    payload.longitude = lng;
  }

  $("submit").disabled = true;
  setStatus("Agen sedang menormalisasi dan mengklasifikasi… biasanya 5–30 detik.", "ok");
  try {
    const response = await fetch("/api/public/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    renderResult(data);
    setStatus("Laporan tercatat dan sudah diprioritaskan.", "ok");
    loadStats();
  } catch (error) {
    setStatus(`Gagal: ${error.message}`, "err");
  } finally {
    $("submit").disabled = false;
  }
});

loadStats();
