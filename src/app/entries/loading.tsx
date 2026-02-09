export default function Loading() {
  return (
    <div className="min-h-screen bg-white p-6 animate-pulse">
      <div className="h-8 bg-zinc-200 rounded w-48 mb-6" />
      <div className="grid grid-cols-7 gap-2 mb-8">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-100 rounded" />
        ))}
      </div>
    </div>
  )
}
