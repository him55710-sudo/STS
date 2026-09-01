import type { Metadata } from "next";
import KeycapApp from "@/components/keycap/KeycapApp";

export const metadata: Metadata = {
  title: "TACTILE · Board",
  description: "Press, collect, and customize tactile virtual keycaps.",
};

export default function BoardPage() {
  return <KeycapApp initialTab="board" />;
}
