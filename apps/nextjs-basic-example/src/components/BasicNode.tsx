"use client";

/**
 * BasicNode — a simple rectangular node with four explicit handles
 * (left, right, top, bottom) for use with pin-based edge routing.
 *
 * Handles are hidden via globals.css but still read by enrichNode
 * so the router knows their exact positions on each node.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

function BasicNodeComponent({ data }: NodeProps) {
  return (
    <div
      style={{
        width: 240,
        height: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        border: "1px solid #cbd5e1",
        borderRadius: 10,
        fontSize: 15,
        fontFamily: "sans-serif",
        color: "#0f172a",
        position: "relative",
      }}
    >
      {/* Target handles — edges can arrive here */}
      <Handle id="left"   type="target" position={Position.Left}   style={{ top: "50%" }} />
      <Handle id="bottom" type="target" position={Position.Bottom} style={{ left: "50%" }} />

      {/* Source handles — edges can depart from here */}
      <Handle id="right" type="source" position={Position.Right} style={{ top: "50%" }} />
      <Handle id="top"   type="source" position={Position.Top}   style={{ left: "50%" }} />

      {data.label as string}
    </div>
  );
}

export const BasicNode = memo(BasicNodeComponent);
