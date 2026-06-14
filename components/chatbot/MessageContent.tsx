"use client";

import { useMemo } from "react";
import DataTable from "./DataTable";
import ChartRenderer from "./ChartRenderer";

interface MessageContentProps {
  content: string;
}

export default function MessageContent({ content }: MessageContentProps) {
  const parsedContent = useMemo(() => {
    console.log("📝 MessageContent parsing content:", content.substring(0, 200) + "...");

    const parts: Array<{
      type: "text" | "table" | "chart" | "image";
      content: any;
    }> = [];

    let remaining = content;
    let lastIndex = 0;

    // Parse tables
    const tableRegex = /\[TABLE_START\]([\s\S]*?)\[TABLE_END\]/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      // Add text before table
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.substring(lastIndex, match.index),
        });
      }

      // Parse table data
      try {
        const tableData = JSON.parse(match[1].trim());
        parts.push({ type: "table", content: tableData });
      } catch (e) {
        console.error("Failed to parse table data:", e);
        parts.push({ type: "text", content: match[0] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Parse charts
    const chartRegex =
      /\[CHART_START\]type:(bar|line|pie)\[CHART_DATA\]([\s\S]*?)\[CHART_END\]/g;
    let chartMatch;
    const tempContent = content;

    while ((chartMatch = chartRegex.exec(tempContent)) !== null) {
      console.log("📊 Found chart match:", chartMatch[0].substring(0, 100) + "...");

      // Add text before chart
      if (chartMatch.index > lastIndex) {
        const textBefore = content.substring(lastIndex, chartMatch.index);
        // Check if we haven't already added this text as part of a table
        const alreadyAdded = parts.some(
          (p) => p.type === "text" && p.content === textBefore
        );
        if (!alreadyAdded && textBefore.trim()) {
          parts.push({ type: "text", content: textBefore });
        }
      }

      // Parse chart data
      try {
        const chartType = chartMatch[1] as "bar" | "line" | "pie";
        const chartDataRaw = chartMatch[2].trim();
        console.log("🔍 Parsing chart data:", { chartType, chartDataRaw: chartDataRaw.substring(0, 100) + "..." });

        const chartData = JSON.parse(chartDataRaw);
        console.log("✅ Successfully parsed chart data:", chartData);

        parts.push({
          type: "chart",
          content: { type: chartType, data: chartData },
        });
      } catch (e) {
        console.error("❌ Failed to parse chart data:", e, "Raw data:", chartMatch[2]);
        parts.push({ type: "text", content: chartMatch[0] });
      }

      lastIndex = chartMatch.index + chartMatch[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      if (remainingText.trim()) {
        parts.push({ type: "text", content: remainingText });
      }
    }

    // If no special content found, return all as text
    if (parts.length === 0) {
      parts.push({ type: "text", content: content });
    }

    console.log("📦 Final parsed parts:", parts.map(p => ({ type: p.type, contentPreview: typeof p.content === 'string' ? p.content.substring(0, 50) : p.content })));

    return parts;
  }, [content]);

  return (
    <div className="space-y-2">
      {parsedContent.map((part, index) => {
        switch (part.type) {
          case "table":
            return <DataTable key={index} data={part.content} />;

          case "chart":
            return <ChartRenderer key={index} chartData={part.content} />;

          case "text":
            return (
              <div key={index} className="text-sm whitespace-pre-wrap">
                {part.content.split("\n").map((line: string, i: number) => {
                  if (!line.trim()) return <br key={i} />;

                  return (
                    <p key={i} className="mb-1">
                      {line}
                    </p>
                  );
                })}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
