// Helper kelas warna badge status laporan
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "terdeteksi":
      return "bg-red-50 text-red-700 border-red-200";
    case "terverifikasi":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "diteruskan":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "dikerjakan":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "menunggu_konfirmasi":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "selesai":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

// Helper kelas warna badge kategori laporan
export function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case "sampah":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "drainase":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "jalan":
      return "bg-pink-50 text-pink-700 border-pink-200";
    case "lampu":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

// Warna hex berdasarkan skor prioritas SMART
export function getPriorityColor(priority: number): string {
  if (priority >= 75) return "#ef4444"; // Red
  if (priority >= 50) return "#f97316"; // Orange
  if (priority >= 25) return "#eab308"; // Yellow
  return "#10b981"; // Green
}
