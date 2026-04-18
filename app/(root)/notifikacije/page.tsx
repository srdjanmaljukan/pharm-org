import { getAllNotifications } from "@/lib/actions/notification.actions";
import { Metadata } from "next";
import NotificationsClient from "./notifications-client";

export const metadata: Metadata = { title: "Notifikacije" };

export default async function NotificationsPage() {
  const notifications = await getAllNotifications();
  return <NotificationsClient notifications={notifications} />;
}
