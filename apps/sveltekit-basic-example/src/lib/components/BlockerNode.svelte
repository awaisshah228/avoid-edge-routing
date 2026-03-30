<!--
  BlockerNode — a handle-free node that acts as a pure obstacle.
  Matches the Next.js basic example BlockerNode.
-->
<script lang="ts">
  let { data }: any = $props();
</script>

<div class="blocker-node">
  {data.label}
</div>

<style>
  .blocker-node {
    width: 140px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1.5px dashed #94a3b8;
    border-radius: 8px;
    font-size: 12px;
    font-family: sans-serif;
    color: #64748b;
  }
</style>
