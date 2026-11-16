"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PDForm, { createSamplePDData } from "../components/PDForm";

export default function CreatePDPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <CreatePDContent />
        </Suspense>
    );
}

function CreatePDContent() {
    const searchParams = useSearchParams();
    const pdId = searchParams.get("id");

    return <PDForm mode="create" initialData={undefined} />;
}
