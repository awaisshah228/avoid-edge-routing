<!--
  BasicNode — a simple rectangular node with four explicit handles
  (left, right, top, bottom) for use with pin-based edge routing.
  Matches the Next.js basic example BasicNode.
-->
<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  let { data }: any = $props();
</script>

<div class="basic-node">
  <Handle id="left"   type="target" position={Position.Left}   style="top: 50%;" />
  <Handle id="bottom" type="target" position={Position.Bottom} style="left: 50%;" />
  <Handle id="right"  type="source" position={Position.Right}  style="top: 50%;" />
  <Handle id="top"    type="source" position={Position.Top}    style="left: 50%;" />
  {data.label}
</div>

<style>
  .basic-node {
    width: 240px;
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    font-size: 15px;
    font-family: sans-serif;
    color: #0f172a;
    position: relative;
  }
</style>
