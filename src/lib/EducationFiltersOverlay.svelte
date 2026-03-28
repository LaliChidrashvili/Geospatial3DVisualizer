<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let schools = false;
  export let kindergartens = false;
  export let universities = false;

  function emit() {
    dispatch("change", { schools, kindergartens, universities });
  }

  function onSchools(e) {
    schools = e.currentTarget.checked;
    emit();
  }

  function onKindergartens(e) {
    kindergartens = e.currentTarget.checked;
    emit();
  }

  function onUniversities(e) {
    universities = e.currentTarget.checked;
    emit();
  }
</script>

<div class="glass" role="region" aria-label="Education filters">
  <h2 class="title">Education</h2>
  <p class="hint">Highlight institutions on the map</p>

  <ul class="list">
    <li>
      <label class="row">
        <input
          type="checkbox"
          checked={schools}
          on:change={onSchools}
        />
        <span class="swatch school"></span>
        <span class="label">Schools</span>
      </label>
    </li>
    <li>
      <label class="row">
        <input
          type="checkbox"
          checked={kindergartens}
          on:change={onKindergartens}
        />
        <span class="swatch kinder"></span>
        <span class="label">Kindergartens</span>
      </label>
    </li>
    <li>
      <label class="row">
        <input
          type="checkbox"
          checked={universities}
          on:change={onUniversities}
        />
        <span class="swatch uni"></span>
        <span class="label">Universities &amp; colleges</span>
      </label>
    </li>
  </ul>
</div>

<style>
  .glass {
    pointer-events: auto;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.55rem 0.7rem;
    border-radius: 12px;
    background: rgba(255, 248, 220, 0.94);
    border: 1px solid rgba(210, 175, 80, 0.45);
    box-shadow:
      0 6px 22px rgba(60, 45, 10, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
  }

  .title {
    margin: 0 0 0.1rem;
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: rgba(35, 30, 12, 0.95);
  }

  .hint {
    margin: 0 0 0.45rem;
    font-size: 0.68rem;
    line-height: 1.3;
    color: rgba(80, 72, 45, 0.72);
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 600;
    color: rgba(35, 30, 12, 0.92);
    user-select: none;
  }

  .row input {
    width: 0.9rem;
    height: 0.9rem;
    accent-color: #b8860b;
    cursor: pointer;
  }

  .swatch {
    width: 0.55rem;
    height: 1.1rem;
    border-radius: 3px;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
  }

  .swatch.school {
    background: linear-gradient(180deg, #ffeb3b, #fdd835);
  }

  .swatch.kinder {
    background: linear-gradient(180deg, #ff9800, #f57c00);
  }

  .swatch.uni {
    background: linear-gradient(180deg, #2196f3, #1976d2);
  }

  .label {
    flex: 1;
    line-height: 1.25;
  }
</style>
