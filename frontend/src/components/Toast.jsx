export default function Toast({ message }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-[var(--success)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-xl animate-slide-in">
      ✓ {message}
    </div>
  )
}
