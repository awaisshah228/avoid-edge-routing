"use client";

/**
 * BlockerNode — a handle-free node that acts as a pure obstacle.
 * No edges connect to it; it exists solely so the router knows
 * to route edges around it.
 */

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";

function BlockerNodeComponent({ data }: NodeProps) {
  return (
    <div
      style={{
        width: 140,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
        border: "1.5px dashed #94a3b8",
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "sans-serif",
        color: "#64748b",
      }}
    >
      {data.label as string}
    </div>
  );
}

export const BlockerNode = memo(BlockerNodeComponent);
