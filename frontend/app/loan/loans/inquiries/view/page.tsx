import { Suspense } from "react";
import InquiryDetailsClient from "./InquiryDetailsClient";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <InquiryDetailsClient />
    </Suspense>
  );
}

function Loading() {
  return <div className="p-6 text-center text-slate-500">Loading inquiry details...</div>;
}
