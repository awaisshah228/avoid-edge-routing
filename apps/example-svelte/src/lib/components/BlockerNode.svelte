<!--
  BlockerNode — a handle-free node that acts as a pure obstacle.
  No edges connect to it; it exists solely so the router knows
  to route edges around it.
-->
<script lang="ts">
  let { data } = $props();
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
