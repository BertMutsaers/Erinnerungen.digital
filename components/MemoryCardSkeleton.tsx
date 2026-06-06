export function SkeletonCard({ size }: { size: 'small' | 'medium' | 'large' }) {
  const sizeClass =
    size === 'large' ? 'col-span-2 row-span-2' :
    size === 'medium' ? 'col-span-2 row-span-1' :
    'col-span-1 row-span-1'

  return (
    <div className={`rounded-2xl bg-gray-200 animate-pulse ${sizeClass}`} />
  )
}

export function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-8 px-4 pb-24">
      {[1926, 1940, 1953, 1969].map((year) => (
        <section key={year}>
          <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="grid grid-cols-2 auto-rows-[120px] gap-3">
            <SkeletonCard size="large" />
            <SkeletonCard size="small" />
            <SkeletonCard size="small" />
            <SkeletonCard size="medium" />
          </div>
        </section>
      ))}
    </div>
  )
}
