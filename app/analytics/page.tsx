import React from "react";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export const metadata = {
  title: "AI 성과 인텔리전스 & 안면 세그멘테이션 분석 | STS",
  description: "안면 5대 부위(코, 입술, 눈, 눈썹, 볼)별 AI 세그멘테이션 구매 전환율 및 실시간 매출 성과 대시보드",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
