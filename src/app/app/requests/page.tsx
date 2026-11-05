import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { RequestsView } from "@/features/requests/components/requests-view";

export const metadata: Metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <RequestsView />
    </Suspense>
  );
}
