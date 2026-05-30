/**
 * Three right-side dots marking the active chapter. `active` is a 0-based index.
 */
export default function ChapterIndicator({ count = 3, active = 0 }) {
  return (
    <div className="absolute right-6 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-4 md:right-10">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="block rounded-full transition-all duration-500 ease-out"
          style={{
            width: i === active ? 7 : 5,
            height: i === active ? 7 : 5,
            background: i === active ? '#f4f1ea' : 'rgba(244,241,234,0.3)',
            transform: i === active ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}
