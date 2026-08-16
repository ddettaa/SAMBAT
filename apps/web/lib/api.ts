import { API_URL, KEYS } from "./constants";
import type { Case, Dinas, Report, ReportDetail } from "./types";

async function getJson<T>(path: string, apiKey?: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error(`Failed to fetch ${path}:`, e);
    return null;
  }
}

export function fetchReports() {
  return getJson<Report[]>("/api/reports", KEYS.operator);
}

export function fetchCases() {
  return getJson<Case[]>("/api/cases", KEYS.operator);
}

export function fetchDinas() {
  return getJson<Dinas[]>("/api/dinas");
}

export function fetchReportDetail(id: string) {
  return getJson<ReportDetail>(`/api/reports/${id}`, KEYS.operator);
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

async function postJson(
  path: string,
  body: unknown,
  apiKey?: string
): Promise<ActionResult> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? `HTTP ${res.status}` };
  } catch {
    return { ok: false, error: "Koneksi ke server gagal." };
  }
}

// Konfirmasi warga bahwa perbaikan selesai (menutup tiket)
export function confirmReport(reportId: string, token: string) {
  return postJson(`/api/reports/${reportId}/confirm`, { token });
}

// Operator: verifikasi & teruskan laporan ke dinas
export function routeReport(reportId: string, dinasId: string) {
  return postJson(
    `/api/reports/${reportId}/route`,
    { dinasId },
    KEYS.operator
  );
}

// Dinas: ambil tugas / selesaikan tugas
export function updateReportStatus(
  reportId: string,
  status: string,
  note: string,
  imageAfter?: string
) {
  return postJson(
    `/api/reports/${reportId}/status`,
    { status, note, imageAfter },
    KEYS.dinas
  );
}

// Demo control center
export function demoReset() {
  return postJson("/api/demo/reset", {}, KEYS.operator);
}

export function demoSimulate(scenario: string) {
  return postJson("/api/demo/simulate", { scenario }, KEYS.operator);
}
