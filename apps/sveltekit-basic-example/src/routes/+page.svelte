<script lang="ts">
  import FlowCanvas from "$lib/components/FlowCanvas.svelte";
  import "../app.css";
</script>

<svelte:head>
  <title>svelteflow-edge-routing SvelteKit Basic Example</title>
</svelte:head>

<main>
  <FlowCanvas />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
  }
</style>
