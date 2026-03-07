import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ */
/*  Shared pulse bar                                                   */
/* ------------------------------------------------------------------ */

function Bar({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-gray-200', className)} />
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonCard                                                       */
/* ------------------------------------------------------------------ */

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <Bar className="h-5 w-2/5" />
      <Bar className="h-4 w-full" />
      <Bar className="h-4 w-4/5" />
      <Bar className="h-4 w-3/5" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonTable                                                      */
/* ------------------------------------------------------------------ */

interface SkeletonTableProps {
  rows?: number;
}

export function SkeletonTable({ rows = 5 }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <Bar className="h-4 w-1/4" />
        <Bar className="h-4 w-1/4" />
        <Bar className="h-4 w-1/4" />
        <Bar className="h-4 w-1/4" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex gap-4 px-4 py-3',
            i < rows - 1 && 'border-b border-gray-100',
          )}
        >
          <Bar className="h-4 w-1/4" />
          <Bar className="h-4 w-1/4" />
          <Bar className="h-4 w-1/4" />
          <Bar className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonKPI                                                        */
/* ------------------------------------------------------------------ */

export function SkeletonKPI() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
      <Bar className="h-4 w-1/3" />
      <Bar className="h-8 w-1/2" />
      <Bar className="h-3 w-2/5" />
    </div>
  );
}
