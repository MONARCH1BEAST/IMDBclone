import React from "react";

const pulse = "animate-pulse bg-zinc-800";

export function MovieGridSkeleton({ count = 6 }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-zinc-900 rounded-lg overflow-hidden">
          <div className={`${pulse} aspect-video`} />
          <div className="p-4 space-y-3">
            <div className={`${pulse} h-6 rounded w-2/3`} />
            <div className={`${pulse} h-4 rounded w-1/3`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-zinc-900 rounded-lg overflow-hidden">
          <div className={`${pulse} aspect-[2/3]`} />
          <div className="p-4 space-y-3">
            <div className={`${pulse} h-5 rounded w-3/4`} />
            <div className={`${pulse} h-4 rounded w-1/2`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MovieDetailsSkeleton() {
  return (
    <div>
      <div className={`${pulse} h-[70vh]`} />
      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className={`${pulse} h-8 rounded w-1/2`} />
            <div className={`${pulse} h-32 rounded`} />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className={`${pulse} h-20 rounded-lg`} />
              <div className={`${pulse} h-20 rounded-lg`} />
            </div>
          </div>
          <div className={`${pulse} h-72 rounded-lg`} />
        </div>
      </main>
    </div>
  );
}

export function InlineNotice({ children }) {
  if (!children) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
      {children}
    </div>
  );
}
