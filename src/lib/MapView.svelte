<script>
  import { onMount, onDestroy } from "svelte";
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";

  let container;
  let map;
  let errorMessage = "";
  let syncPitchRaf = 0;

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  /** When true, use Mercator only (flat map); no globe — stable centering, no 3D globe view. */
  const USE_FLAT_MAP_ONLY = false;

  onMount(() => {
    if (!token) {
      errorMessage =
        "Set VITE_MAPBOX_ACCESS_TOKEN in a .env file at the project root (Mapbox public token).";
      return;
    }

    mapboxgl.accessToken = token;

    // Mapbox Standard has no legacy "composite" source; 3D objects use Standard style config.
    map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/standard",
      center: [44.8271, 41.7151],
      zoom: 15.5,
      pitch: 65,
      bearing: -25,
      antialias: true,
      ...(USE_FLAT_MAP_ONLY ? { projection: "mercator" } : {}),
      config: {
        basemap: {
          show3dObjects: true,
        },
      },
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Globe ↔ Mercator transition at high pitch visually shifts the globe; reset pitch/bearing during
    // zoom (not only on zoomend), before zoom is low enough for the globe to appear.
    const PITCH_ZOOM_CUTOFF = 8;
    const HIGH_PITCH = 65;
    const HIGH_BEARING = -25;

    function syncPitchBearingToZoom() {
      const z = map.getZoom();
      const low = z < PITCH_ZOOM_CUTOFF;
      const tp = low ? 0 : HIGH_PITCH;
      const tb = low ? 0 : HIGH_BEARING;
      if (Math.abs(map.getPitch() - tp) > 0.01) map.setPitch(tp);
      if (Math.abs(map.getBearing() - tb) > 0.01) map.setBearing(tb);
    }

    function scheduleSyncPitchBearing() {
      if (syncPitchRaf) return;
      syncPitchRaf = requestAnimationFrame(() => {
        syncPitchRaf = 0;
        syncPitchBearingToZoom();
      });
    }

    map.on("load", () => {
      map.resize();
      if (typeof map.setConfigProperty === "function") {
        try {
          map.setConfigProperty("basemap", "show3dObjects", true);
        } catch (e) {
          console.warn(e);
        }
      }
    });

    map.once("idle", () => {
      map.resize();
    });

    map.on("zoom", scheduleSyncPitchBearing);
    map.on("zoomend", syncPitchBearingToZoom);

    map.on("error", (e) => {
      if (e.error?.message) {
        errorMessage = e.error.message;
      }
    });
  });

  onDestroy(() => {
    if (syncPitchRaf) cancelAnimationFrame(syncPitchRaf);
    syncPitchRaf = 0;
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
