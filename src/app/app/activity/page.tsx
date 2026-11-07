import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityView } from "@/features/activity/components/activity-view";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ActivityView />
    </Suspense>
  );
}
