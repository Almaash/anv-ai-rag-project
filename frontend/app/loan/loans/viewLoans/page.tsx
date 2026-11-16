import { Suspense } from "react";
import LoanDetailsClient from "./LoanDetailsClient";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <LoanDetailsClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="p-6 text-center text-gray-500">
      Loading loan details...
    </div>
  );
}
