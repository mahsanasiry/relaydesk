import { redirect } from "next/navigation";
import { APP_HOME } from "@/lib/auth/redirects";

export default function AppIndex() {
  redirect(APP_HOME);
}
