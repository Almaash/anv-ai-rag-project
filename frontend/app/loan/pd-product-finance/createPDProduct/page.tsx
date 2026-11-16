"use client";

import { Suspense } from "react";
import PDProductFinanceForm from "../components/PDProductFinanceForm";

export default function CreatePDProductPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <PDProductFinanceForm mode="create" />
        </Suspense>
    );
}
