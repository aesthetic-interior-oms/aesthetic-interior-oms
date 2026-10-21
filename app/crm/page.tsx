import { redirect } from "next/navigation";

export default function CrmEntryPage() {
  // Sign-in is now at the root page (/)
  redirect("/");
}
