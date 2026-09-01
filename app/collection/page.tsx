import type { Metadata } from "next";
import KeycapApp from "@/components/keycap/KeycapApp";

export const metadata: Metadata = {
  title: "TACTILE · Collection",
  description: "Browse your collected virtual keycaps.",
};

export default function CollectionPage() {
  return <KeycapApp initialTab="collection" />;
}
