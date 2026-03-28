<script>
  import MapView from "$lib/MapView.svelte";

  let searchQuery = "";
</script>

<main class="shell">
  <MapView bind:searchQuery />
</main>

<style>
  .shell {
    width: 100%;
    height: 100vh;
    margin: 0;
    padding: 0;
  }
</style>
