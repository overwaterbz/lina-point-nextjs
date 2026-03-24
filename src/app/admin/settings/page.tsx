import { redirect } from "next/navigation";

/**
 * /admin/settings redirects to the first (and currently only) settings sub-page.
 * Prevents a 404 when navigating to the parent path.
 */
export default function AdminSettingsRoot() {
  redirect("/admin/settings/refund-policy");
}
