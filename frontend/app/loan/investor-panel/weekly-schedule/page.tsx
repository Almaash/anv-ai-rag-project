import { Suspense } from "react";
import WeeklyScheduleClient from "./WeeklyScheduleClient";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Loading Schedule...
          </p>
        </div>
      }
    >
      <WeeklyScheduleClient />
    </Suspense>
  );
}
