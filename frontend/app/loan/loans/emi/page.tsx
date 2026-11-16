import { Suspense } from "react";
import LoanEmiClient from "./LoanEmiClient";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <LoanEmiClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-20">
      <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
