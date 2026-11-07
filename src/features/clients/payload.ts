import type { ClientFormValues } from "@/lib/validation/client";
import type { ClientRow } from "./api";

export function emptyClientValues(): ClientFormValues {
  return {
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
  };
}

export function toClientFormValues(client: ClientRow): ClientFormValues {
  return {
    name: client.name,
    contactName: client.contactName,
    contactEmail: client.contactEmail,
    contactPhone: client.contactPhone,
    notes: client.notes,
  };
}

export function toClientRecord(values: ClientFormValues) {
  return {
    name: values.name.trim(),
    contact_name: values.contactName.trim(),
    contact_email: values.contactEmail.trim(),
    contact_phone: values.contactPhone.trim(),
    notes: values.notes,
  };
}
