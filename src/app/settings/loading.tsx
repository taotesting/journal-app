export default function Loading() {
  return (
    <div className="min-h-screen bg-white p-6 animate-pulse">
      <div className="h-8 bg-zinc-200 rounded w-32 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-zinc-100 rounded" />
        ))}
      </div>
    </div>
  )
}
