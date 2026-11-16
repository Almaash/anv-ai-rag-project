import { Suspense } from "react";
import EditLoanApplicationClient from "./EditLoanApplicationClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <EditLoanApplicationClient />
    </Suspense>
  );
}
