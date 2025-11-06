import { Skeleton } from "@/components/shared/Skeleton";

export function VideoCarouselSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px]">
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

