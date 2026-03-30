<!--
  ControlsPanel — Svelte replacement for Leva controls panel.
  Provides sliders, checkboxes, and select dropdowns for routing & layout settings.
-->
<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  // Routing settings
  export let connectorType = "orthogonal";
  export let edgeRounding = 0;
  export let edgeToEdgeSpacing = 6;
  export let edgeToNodeSpacing = 8;
  export let diagramGridSize = 0;
  export let stubSize = 12;
  export let shouldSplitEdgesNearHandle = true;
  export let autoBestSideConnection = false;
  export let hateCrossings = false;
  export let routeOnlyWhenBlocked = false;
  export let hideHandles = true;
  export let realTimeRouting = false;
  export let handleSpacing = 6;
  export let segmentPenalty = 10;
  export let anglePenalty = 0;
  export let reverseDirectionPenalty = 0;
  export let crossingPenalty = 0;

  // Layout settings
  export let layoutAlgorithm = "elk";
  export let elkMode = "mrtree";
  export let layoutDirection = "LR";
  export let layoutSpacing = 20;
  export let resolveOverlaps = true;

  let collapsed = false;
  let routingOpen = true;
  let layoutOpen = true;
  let penaltiesOpen = false;

  function onRunLayout() {
    dispatch("runlayout");
  }
</script>

<div class="panel" class:collapsed>
  <button class="panel-toggle" on:click={() => (collapsed = !collapsed)}>
    {collapsed ? "▸" : "▾"} Edge Routing Settings
  </button>

  {#if !collapsed}
    <!-- Routing Section -->
    <div class="section">
      <button class="section-toggle" on:click={() => (routingOpen = !routingOpen)}>
        {routingOpen ? "▾" : "▸"} Routing
      </button>
      {#if routingOpen}
        <div class="controls">
          <label>
            <span>Edge Style</span>
            <select bind:value={connectorType}>
              <option value="orthogonal">Orthogonal</option>
              <option value="bezier">Bezier</option>
              <option value="polyline">Polyline</option>
            </select>
          </label>
          <label><span>Rounding</span><input type="range" min={0} max={48} bind:value={edgeRounding} /><span class="val">{edgeRounding}</span></label>
          <label><span>Edge↔Edge</span><input type="range" min={0} max={50} bind:value={edgeToEdgeSpacing} /><span class="val">{edgeToEdgeSpacing}</span></label>
          <label><span>Edge↔Node</span><input type="range" min={0} max={48} bind:value={edgeToNodeSpacing} /><span class="val">{edgeToNodeSpacing}</span></label>
          <label><span>Grid Size</span><input type="range" min={0} max={48} bind:value={diagramGridSize} /><span class="val">{diagramGridSize}</span></label>
          <label><span>Stub Size</span><input type="range" min={0} max={60} bind:value={stubSize} /><span class="val">{stubSize}</span></label>
          <label><span>Handle Spacing</span><input type="range" min={1} max={60} bind:value={handleSpacing} /><span class="val">{handleSpacing}</span></label>
          <label><span>Split Near Handle</span><input type="checkbox" bind:checked={shouldSplitEdgesNearHandle} /></label>
          <label><span>Auto Best Side</span><input type="checkbox" bind:checked={autoBestSideConnection} /></label>
          <label><span>Avoid Crossings</span><input type="checkbox" bind:checked={hateCrossings} /></label>
          <label><span>Route When Blocked</span><input type="checkbox" bind:checked={routeOnlyWhenBlocked} /></label>
          <label><span>Hide Handles</span><input type="checkbox" bind:checked={hideHandles} /></label>
          <label><span>Route While Drag</span><input type="checkbox" bind:checked={realTimeRouting} /></label>

          <button class="section-toggle" on:click={() => (penaltiesOpen = !penaltiesOpen)}>
            {penaltiesOpen ? "▾" : "▸"} Penalties
          </button>
          {#if penaltiesOpen}
            <label><span>Segment</span><input type="range" min={0} max={100} bind:value={segmentPenalty} /><span class="val">{segmentPenalty}</span></label>
            <label><span>Angle</span><input type="range" min={0} max={100} bind:value={anglePenalty} /><span class="val">{anglePenalty}</span></label>
            <label><span>Reverse</span><input type="range" min={0} max={100} bind:value={reverseDirectionPenalty} /><span class="val">{reverseDirectionPenalty}</span></label>
            <label><span>Crossing</span><input type="range" min={0} max={200} bind:value={crossingPenalty} /><span class="val">{crossingPenalty}</span></label>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Layout Section -->
    <div class="section">
      <button class="section-toggle" on:click={() => (layoutOpen = !layoutOpen)}>
        {layoutOpen ? "▾" : "▸"} Layout
      </button>
      {#if layoutOpen}
        <div class="controls">
          <label>
            <span>Algorithm</span>
            <select bind:value={layoutAlgorithm}>
              <option value="elk">ELK</option>
              <option value="dagre">Dagre</option>
            </select>
          </label>
          <label>
            <span>ELK Mode</span>
            <select bind:value={elkMode}>
              <option value="layered">Layered</option>
              <option value="stress">Stress</option>
              <option value="mrtree">MR Tree</option>
              <option value="force">Force</option>
              <option value="radial">Radial</option>
            </select>
          </label>
          <label>
            <span>Direction</span>
            <select bind:value={layoutDirection}>
              <option value="LR">→ Right</option>
              <option value="TB">↓ Down</option>
              <option value="RL">← Left</option>
              <option value="BT">↑ Up</option>
            </select>
          </label>
          <label><span>Spacing</span><input type="range" min={10} max={200} step={10} bind:value={layoutSpacing} /><span class="val">{layoutSpacing}</span></label>
          <label><span>Fix Overlaps</span><input type="checkbox" bind:checked={resolveOverlaps} /></label>
          <button class="run-btn" on:click={onRunLayout}>Run Layout</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 100;
    background: #1e293b;
    color: #e2e8f0;
    border-radius: 8px;
    font-family: sans-serif;
    font-size: 12px;
    width: 320px;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .panel.collapsed { width: auto; }
  .panel-toggle {
    display: block;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: #e2e8f0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }
  .section { padding: 0 8px 8px; }
  .section-toggle {
    display: block;
    width: 100%;
    padding: 4px 4px;
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .controls { display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 4px;
  }
  label span:first-child { flex: 0 0 110px; color: #94a3b8; font-size: 11px; }
  label input[type="range"] { flex: 1; accent-color: #3b82f6; }
  label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #3b82f6; }
  label select { flex: 1; background: #334155; color: #e2e8f0; border: 1px solid #475569; border-radius: 4px; padding: 2px 4px; font-size: 11px; }
  .val { color: #64748b; font-size: 10px; min-width: 24px; text-align: right; }
  .run-btn {
    margin-top: 4px;
    padding: 6px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }
  .run-btn:hover { background: #2563eb; }
</style>
