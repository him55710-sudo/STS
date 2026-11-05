import type { Metadata } from "next";
import { WatchFeed } from "@/components/beauty-commerce/WatchFeed";

export const metadata: Metadata = { title: "Watch · STS", description: "A personal vertical beauty video feed with original creator routines, clear product sources and self-selected preferences." };
export default function WatchPage() { return <WatchFeed />; }
