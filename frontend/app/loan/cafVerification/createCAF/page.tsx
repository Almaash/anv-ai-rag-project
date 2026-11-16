"use client";

import { useSearchParams } from "next/navigation";
import CAFForm, { createSampleCAFData } from "../components/CAFForm";

export default function CreateCAFPage() {
    const searchParams = useSearchParams();
    const cafId = searchParams.get("id");

    const initialData = cafId
        ? {
              ...createSampleCAFData(),
              productCode: cafId,
          }
        : undefined;

    return <CAFForm mode="create" initialData={initialData} />;
}
