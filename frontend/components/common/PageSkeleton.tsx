"use client";

type Props = {
  rows?: number;
};

export default function PageSkeleton({ rows = 4 }: Props) {
  return (
    <div className="p-6 space-y-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl p-4 border">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );
}
