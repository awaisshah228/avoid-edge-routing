<!--
  FlowCanvas — wrapper providing SvelteFlowProvider.
-->
<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import FlowCanvasInner from "./FlowCanvasInner.svelte";
</script>

<SvelteFlowProvider>
  <FlowCanvasInner />
</SvelteFlowProvider>
