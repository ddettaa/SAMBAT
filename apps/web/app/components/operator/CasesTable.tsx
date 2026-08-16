"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCategoryBadgeClass, getStatusBadgeClass } from "@/lib/utils";
import type { Case } from "@/lib/types";

interface CasesTableProps {
  cases: Case[];
}

// Tabel kasus kolektif hasil penggabungan (clustered cases) — pakai shadcn Table
export default function CasesTable({ cases }: CasesTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-extrabold text-slate-900">
        Kasus Kolektif Hasil Penggabungan (Clustered Cases)
      </h3>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 text-slate-400 uppercase tracking-wider">
            <TableHead className="pb-3 font-bold">ID Kasus</TableHead>
            <TableHead className="pb-3 font-bold">Kategori</TableHead>
            <TableHead className="pb-3 font-bold">Nama & Volume</TableHead>
            <TableHead className="pb-3 text-center font-bold">Prioritas</TableHead>
            <TableHead className="pb-3 font-bold">Status</TableHead>
            <TableHead className="pb-3 font-bold">Dibuat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100">
          {cases.map((c) => (
            <TableRow key={c.id} className="text-slate-700 hover:bg-slate-50/50">
              <TableCell className="py-4 font-mono font-bold text-slate-500">
                {c.id}
              </TableCell>
              <TableCell className="py-4">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold capitalize ${getCategoryBadgeClass(c.category)}`}
                >
                  {c.category}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <span className="font-bold text-slate-900">{c.title}</span>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200"
                  >
                    {c.report_count} Laporan Serupa
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="py-4 text-center font-bold text-red-600">
                {c.score} / 100
              </TableCell>
              <TableCell className="py-4">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${getStatusBadgeClass(c.status)}`}
                >
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="py-4 text-slate-400">
                {new Date(c.created_at).toLocaleString("id-ID")}
              </TableCell>
            </TableRow>
          ))}

          {cases.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center font-medium text-slate-400"
              >
                Belum ada kasus yang digabungkan.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
