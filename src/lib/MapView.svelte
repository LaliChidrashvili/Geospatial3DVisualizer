<script>
  import { onMount, onDestroy } from "svelte";
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";

  let container;
  let map;
  let errorMessage = "";

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  onMount(() => {
    if (!token) {
      errorMessage =
        "დააყენე VITE_MAPBOX_ACCESS_TOKEN პროექტის ფესვში .env ფაილში (Mapbox-ის public token).";
      return;
    }

    mapboxgl.accessToken = token;

    // Mapbox Standard-ს არ აქვს legacy „composite“ წყარო — 3D ობიექტები Standard-ის config-ით ირთვება.
    map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/standard",
      center: [44.8271, 41.7151],
      zoom: 15.5,
      pitch: 65,
      bearing: -25,
      antialias: true,
      config: {
        basemap: {
          show3dObjects: true,
        },
      },
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (typeof map.setConfigProperty === "function") {
        try {
          map.setConfigProperty("basemap", "show3dObjects", true);
        } catch (e) {
          console.warn(e);
        }
      }
    });

    map.on("error", (e) => {
      if (e.error?.message) {
        errorMessage = e.error.message;
      }
    });
  });

  onDestroy(() => {
    map?.remove();
    map = undefined;
  });
</script>

<div class="wrap">
  {#if errorMessage}
    <div class="banner" role="alert">{errorMessage}</div>
  {/if}
  <div class="map" bind:this={container}></div>
</div>

<style>
  .wrap {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .map {
    position: absolute;
    inset: 0;
  }

  .banner {
    position: absolute;
    z-index: 2;
    left: 50%;
    transform: translateX(-50%);
    top: 0.75rem;
    max-width: min(90%, 40rem);
    padding: 0.6rem 0.9rem;
    border-radius: 8px;
    background: rgba(180, 40, 40, 0.95);
    color: #fff;
    font-size: 0.85rem;
    line-height: 1.4;
    text-align: center;
    pointer-events: none;
  }
</style>
