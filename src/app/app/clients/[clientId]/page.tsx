import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientDetail } from "@/features/clients/components/client-detail";
import { isUuid } from "@/lib/utils/uuid";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({
  params,
}: Readonly<{ params: Promise<{ clientId: string }> }>) {
  const { clientId } = await params;
  if (!isUuid(clientId)) {
    notFound();
  }

  return <ClientDetail clientId={clientId} />;
}
