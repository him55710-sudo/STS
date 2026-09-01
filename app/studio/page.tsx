import type { Metadata } from "next";
import KeycapApp from "@/components/keycap/KeycapApp";

export const metadata: Metadata = {
  title: "TACTILE · Studio",
  description: "Customize the look, material, feel, and sound of a keycap.",
};

export default function StudioPage() {
  return <KeycapApp initialTab="studio" />;
}
