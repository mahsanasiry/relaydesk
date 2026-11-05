import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestDetail } from "@/features/requests/components/request-detail";
import { isUuid } from "@/lib/utils/uuid";

export const metadata: Metadata = { title: "Request" };

export default async function RequestPage({
  params,
}: Readonly<{ params: Promise<{ requestId: string }> }>) {
  const { requestId } = await params;
  // A malformed id would reach the database as an invalid uuid and fail with a technical error.
  if (!isUuid(requestId)) {
    notFound();
  }

  return <RequestDetail requestId={requestId} />;
}
