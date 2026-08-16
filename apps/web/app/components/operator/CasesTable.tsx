import { getCategoryBadgeClass, getStatusBadgeClass } from "@/lib/utils";
import type { Case } from "@/lib/types";

interface CasesTableProps {
  cases: Case[];
}

// Tabel kasus kolektif hasil penggabungan (clustered cases)
export default function CasesTable({ cases }: CasesTableProps) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
      <h3 className="text-sm font-extrabold text-slate-900 mb-4">
        Kasus Kolektif Hasil Penggabungan (Clustered Cases)
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
              <th className="pb-3 font-bold">ID Kasus</th>
              <th className="pb-3 font-bold">Kategori</th>
              <th className="pb-3 font-bold">Nama Kasus & Volume Laporan</th>
              <th className="pb-3 font-bold text-center">Bobot Prioritas</th>
              <th className="pb-3 font-bold">Status</th>
              <th className="pb-3 font-bold">Waktu Dibuat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.map((c) => (
              <tr key={c.id} className="text-slate-700 hover:bg-slate-50/50">
                <td className="py-4 font-mono text-slate-500 font-bold">
                  {c.id}
                </td>
                <td className="py-4 capitalize">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${getCategoryBadgeClass(c.category)}`}
                  >
                    {c.category}
                  </span>
                </td>
                <td className="py-4">
                  <span className="font-bold text-slate-900">{c.title}</span>
                  <div className="mt-1">
                    <span className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full w-max">
                      {c.report_count} Laporan Serupa Digabung
                    </span>
                  </div>
                </td>
                <td className="py-4 text-center font-bold text-red-600">
                  {c.score} / 100
                </td>
                <td className="py-4">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${getStatusBadgeClass(c.status)}`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="py-4 text-slate-400">
                  {new Date(c.created_at).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}

            {cases.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-slate-400 font-medium"
                >
                  Belum ada kasus yang digabungkan. Jalankan simulasi duplikasi
                  di panel kanan!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
