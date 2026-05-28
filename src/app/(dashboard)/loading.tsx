const COLS = ['w-6','w-24','w-20','w-16','w-14','w-16','w-14','w-10']

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-24 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-7 w-20 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {COLS.map((w, i) => (
                  <th key={i} className="py-3 px-4">
                    <div className={`h-2.5 ${w} bg-slate-200 rounded animate-pulse`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  {COLS.map((w, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className={`h-2.5 ${w} bg-slate-100 rounded animate-pulse`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
