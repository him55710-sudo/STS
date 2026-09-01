import type { Metadata } from "next";
import KeycapApp from "@/components/keycap/KeycapApp";

export const metadata: Metadata = {
  title: "TACTILE · Rewards",
  description: "Track physical keycap reward progress.",
};

export default function RewardsPage() {
  return <KeycapApp initialTab="rewards" />;
}
