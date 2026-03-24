# avoid-edge-routing

> [![npm](https://img.shields.io/npm/v/obstacle-router)](https://www.npmjs.com/package/obstacle-router) [![npm](https://img.shields.io/npm/v/reactflow-edge-routing)](https://www.npmjs.com/package/reactflow-edge-routing) [![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

A monorepo providing **obstacle-aware edge routing** for node-based diagrams. Edges automatically route around nodes using orthogonal, polyline, or bezier paths — powered by a pure TypeScript port of [libavoid](https://www.adaptagrams.org/documentation/libavoid.html) with first-class [React Flow](https://reactflow.dev/) integration.

If this project saves you time, consider supporting its development:

**USDC (Solana):** `59FhVxK3uxABiJ9VzXtCoyCxqq4nhoZDBtUV3gEkiexo`

<img src="https://raw.githubusercontent.com/awaisshah228/avoid-edge-routing/main/assets/solana-donate-qr.png" width="200" alt="Solana USDC QR Code" />

---

## Packages

| Package | Description | npm |
|---|---|---|
| [`obstacle-router`](packages/obstacle-router) | Core routing engine — TypeScript port of libavoid, zero dependencies | [![npm](https://img.shields.io/npm/v/obstacle-router)](https://www.npmjs.com/package/obstacle-router) |
| [`reactflow-edge-routing`](packages/reactflow-edge-routing) | React Flow integration with hooks, stores, and Web Worker support | [![npm](https://img.shields.io/npm/v/reactflow-edge-routing)](https://www.npmjs.com/package/reactflow-edge-routing) |

## Features

- **Orthogonal, polyline, and bezier** connector styles
- **Pin-based routing** — edges attach to exact handle positions on nodes
- **Multi-handle nodes** — multiple inputs/outputs per node with automatic spacing
- **Auto best-side connection** — picks optimal handle side based on relative node positions
- **Obstacle avoidance** — edges route around all nodes in the diagram
- **Nudging** — parallel edge segments are automatically spaced apart
- **Edge rounding** — configurable corner radius for orthogonal paths
- **Split edges near handle** — toggle between fanned-out and converged edge endpoints
- **Stub routing** — configurable stub segments when split-at-handle is off
- **Collision resolution** — post-layout node overlap fixing
- **Group and subflow support** — nested node hierarchies
- **Web Worker support** — offload routing computation to a background thread
- **Incremental updates** — only re-route affected edges when nodes move

## Quick Start

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run the interactive example
yarn dev --filter=reactflow-edge-routing-example
```

## Usage

```tsx
import { useEdgeRouting, useRoutedEdgePath } from "reactflow-edge-routing";

function FlowCanvas() {
  const { updateRoutingOnNodesChange, resetRouting } = useEdgeRouting(nodes, edges, {
    edgeRounding: 12,
    edgeToEdgeSpacing: 4,
    edgeToNodeSpacing: 8,
    autoBestSideConnection: true,
  });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={(changes) => {
        setNodes(applyNodeChanges(changes));
        updateRoutingOnNodesChange(changes);
      }}
      onNodeDragStop={() => resetRouting()}
      edgeTypes={{ routed: RoutedEdge }}
    />
  );
}
```

## Example App

The `apps/example` directory contains an interactive demo with:

- Multiple graph examples (basic, multi-handle, groups, subflows, DAG, tree, stress test)
- Live parameter controls for all routing and layout settings
- Auto-layout integration (ELK, Dagre)
- Collision resolution

## Project Structure

```
avoid-edge-routing/
  apps/
    example/                   # Interactive demo (Vite + React 19)
  packages/
    obstacle-router/           # Core routing engine (pure TypeScript, zero deps)
    reactflow-edge-routing/    # React Flow hooks & integration
```

## Sponsor

If this library is useful to you, please consider sponsoring:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

**USDC (Solana):** `59FhVxK3uxABiJ9VzXtCoyCxqq4nhoZDBtUV3gEkiexo`

<img src="https://raw.githubusercontent.com/awaisshah228/avoid-edge-routing/main/assets/solana-donate-qr.png" width="200" alt="Solana USDC QR Code" />

## License

- `obstacle-router` — LGPL-2.1 (based on libavoid by Michael Wybrow, Monash University)
- `reactflow-edge-routing` — MIT
