<!--
  FlowCanvas — wrapper that provides SvelteFlowProvider context.
  The actual flow logic lives in FlowCanvasInner which runs inside the provider.
-->
<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import FlowCanvasInner from "./FlowCanvasInner.svelte";
</script>

<SvelteFlowProvider>
  <FlowCanvasInner />
</SvelteFlowProvider>
