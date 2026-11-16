"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CAMForm, { createSampleCAMData } from "../components/CAMForm";

export default function CreateCAMPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <CreateCAMContent />
        </Suspense>
    );
}

function CreateCAMContent() {
    const searchParams = useSearchParams();
    const camId = searchParams.get("id");

    return <CAMForm mode="create" initialData={undefined} />;
}
