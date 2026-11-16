"use client";

import { useSearchParams } from "next/navigation";
import CAFForm from "../components/CAFForm";

export default function CreateCAFPage() {
    const searchParams = useSearchParams();
    const productId = searchParams.get("product_id");

    return <CAFForm mode="create" preselectedProductId={productId} />;
}
