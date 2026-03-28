<script>
  import { onMount, onDestroy } from "svelte";
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";
  import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
  import "@mapbox/mapbox-gl-geocoder/lib/mapbox-gl-geocoder.css";

  let container;
  let map;
  let errorMessage = "";
  let syncPitchRaf = 0;
  /** @type {unknown} */
  let geocoderControl = null;
  /** While true, skip auto pitch/bearing sync so flyTo/fitBounds from search is not overwritten */
  let skipPitchSyncForSearch = false;

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  /** Geocoder result labels: not the search language — you can type Latin or Georgian. Comma-separated IETF tags (e.g. en,ka). See VITE_GEOCODER_LANGUAGE in .env.example */
  const geocoderLanguage =
    import.meta.env.VITE_GEOCODER_LANGUAGE || "en,ka";

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

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false,
      placeholder: "Search city or place",
      types: "place,locality,region",
      language: geocoderLanguage,
      // Default is 2 — show suggestions from the first character
      minLength: 1,
      // Do not bias results to current map center — needed for globe / zoomed-out views
      trackProximity: false,
      flyTo: false,
    });

    function finishSearchNavigation() {
      skipPitchSyncForSearch = false;
      syncPitchBearingToZoom();
    }

    geocoder.on("result", (e) => {
      const f = e.result;
      if (!f) return;

      skipPitchSyncForSearch = true;
      map.once("moveend", finishSearchNavigation);

      const bbox = f.bbox;
      if (bbox && bbox.length >= 4) {
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          {
            pitch: 65,
            bearing: -25,
            duration: 2200,
            padding: 52,
            essential: true,
            maxZoom: 15,
          }
        );
      } else {
        const c = f.center || f.geometry?.coordinates;
        if (c) {
          map.flyTo({
            center: c,
            zoom: 14,
            pitch: 65,
            bearing: -25,
            duration: 2200,
            essential: true,
          });
        } else {
          finishSearchNavigation();
        }
      }
    });

    map.addControl(geocoder, "top-left");
    geocoderControl = geocoder;

    // Globe ↔ Mercator transition at high pitch visually shifts the globe; reset pitch/bearing during
    // zoom (not only on zoomend), before zoom is low enough for the globe to appear.
    const PITCH_ZOOM_CUTOFF = 8;
    const HIGH_PITCH = 65;
    const HIGH_BEARING = -25;

    function syncPitchBearingToZoom() {
      if (skipPitchSyncForSearch) return;
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
    if (map && geocoderControl) {
      map.removeControl(geocoderControl);
      geocoderControl = null;
    }
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

  :global(.mapboxgl-ctrl-top-left) {
    z-index: 2;
  }

  :global(.mapboxgl-ctrl-top-right) {
    z-index: 2;
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
