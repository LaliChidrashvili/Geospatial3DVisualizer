<!--
  Map logic (pitch/zoom, etc.) lives here; there is no MapComponent.svelte in this project.
-->
<script>
  import { onMount, onDestroy } from "svelte";
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";
  import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
  import "@mapbox/mapbox-gl-geocoder/lib/mapbox-gl-geocoder.css";
  import EducationFiltersOverlay from "./EducationFiltersOverlay.svelte";
  import {
    ensureEducationLayers,
    setEducationVisibility,
    removeEducationLayers,
  } from "./educationLayers.js";

  let container;
  /** @type {HTMLDivElement | undefined} */
  let geocoderSlot;
  let map;
  let errorMessage = "";
  let syncPitchRaf = 0;
  /** @type {unknown} */
  let geocoderControl = null;
  /** While true, skip auto pitch/bearing sync so flyTo/fitBounds from search is not overwritten */
  let skipPitchSyncForSearch = false;

  let mapLoaded = false;

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
      pitch: 45,
      bearing: -25,
      antialias: true,
      ...(USE_FLAT_MAP_ONLY ? { projection: "mercator" } : {}),
      config: {
        basemap: {
          show3dObjects: true,
          lightPreset: "day",
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
            pitch: 45,
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
            pitch: 45,
            bearing: -25,
            duration: 2200,
            essential: true,
          });
        } else {
          finishSearchNavigation();
        }
      }
    });

    const geocoderEl = geocoder.onAdd(map);
    if (geocoderSlot) {
      geocoderSlot.appendChild(geocoderEl);
    }
    geocoderControl = geocoder;

    /** Below this zoom, pitch/bearing stay 0 so the globe stays centered. */
    const Z_GLOBE = 5;
    /** Above this zoom, apply 3D tilt (buildings, shadows). */
    const Z_TILT = 13;
    /** For z in (Z_TILT, Z_TILT + RAMP), ease pitch/bearing from 0° toward HIGH_* (smooth ramp). */
    const TILT_RAMP = 1;
    const HIGH_PITCH = 45;
    const HIGH_BEARING = -25;

    /**
     * @returns {{ pitch: number; bearing: number }}
     */
    function targetPitchBearingForZoom(z) {
      if (z < Z_GLOBE) {
        return { pitch: 0, bearing: 0 };
      }
      if (z <= Z_TILT) {
        return { pitch: 0, bearing: 0 };
      }
      if (z >= Z_TILT + TILT_RAMP) {
        return { pitch: HIGH_PITCH, bearing: HIGH_BEARING };
      }
      const t = (z - Z_TILT) / TILT_RAMP;
      return {
        pitch: HIGH_PITCH * t,
        bearing: HIGH_BEARING * t,
      };
    }

    function syncPitchBearingToZoom() {
      if (skipPitchSyncForSearch) return;
      const z = map.getZoom();
      const { pitch: tp, bearing: tb } = targetPitchBearingForZoom(z);
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
          map.setConfigProperty("basemap", "lightPreset", "day");
        } catch (e) {
          console.warn(e);
        }
      }
      try {
        ensureEducationLayers(map);
        setEducationVisibility(map, {
          schools: false,
          kindergartens: false,
          universities: false,
        });
      } catch (e) {
        console.warn("Education highlight layers", e);
      }
      mapLoaded = true;
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

  function onEducationFilterChange(
    /** @type {{ detail: { schools: boolean; kindergartens: boolean; universities: boolean } }} */ ev
  ) {
    if (map && mapLoaded) {
      setEducationVisibility(map, ev.detail);
    }
  }

  onDestroy(() => {
    if (syncPitchRaf) cancelAnimationFrame(syncPitchRaf);
    syncPitchRaf = 0;
    if (geocoderControl) {
      geocoderControl.onRemove();
      geocoderControl = null;
    }
    if (map) {
      try {
        removeEducationLayers(map);
      } catch {
        /* ignore */
      }
    }
    map?.remove();
    map = undefined;
    mapLoaded = false;
  });
</script>

<div class="wrap">
  {#if errorMessage}
    <div class="banner" role="alert">{errorMessage}</div>
  {/if}
  <div class="map" bind:this={container}></div>
  <div class="left-ui">
    <div class="geocoder-slot" bind:this={geocoderSlot}></div>
    {#if mapLoaded}
      <div class="filters-overlay">
        <EducationFiltersOverlay on:change={onEducationFilterChange} />
      </div>
    {/if}
  </div>
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

  :global(.mapboxgl-ctrl-top-right) {
    z-index: 2;
    top: 0.75rem;
    right: 0.75rem;
  }

  /* Light yellow UI — match suggestions, zoom, Education panel */
  .wrap :global(.mapboxgl-ctrl-geocoder) {
    background: rgba(255, 248, 220, 0.94) !important;
    border: 1px solid rgba(210, 175, 80, 0.45) !important;
    border-radius: 12px !important;
    box-shadow:
      0 6px 22px rgba(60, 45, 10, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .wrap :global(.mapboxgl-ctrl-geocoder--input) {
    color: rgba(35, 30, 12, 0.95) !important;
    height: 38px;
    font-size: 0.875rem !important;
  }

  .wrap :global(.mapboxgl-ctrl-geocoder--input::placeholder) {
    color: rgba(80, 72, 45, 0.55);
  }

  .wrap :global(.mapboxgl-ctrl-geocoder--input:focus) {
    color: rgba(22, 18, 6, 0.98) !important;
    outline: none !important;
  }

  .wrap :global(.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon) {
    fill: rgba(55, 48, 22, 0.65);
  }

  .wrap :global(.mapboxgl-ctrl-geocoder .suggestions) {
    background: rgba(255, 248, 220, 0.97) !important;
    border: 1px solid rgba(210, 175, 80, 0.45);
    border-radius: 12px !important;
    box-shadow: 0 10px 28px rgba(60, 45, 10, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .wrap :global(.mapboxgl-ctrl-geocoder .suggestions > li > a) {
    color: rgba(45, 38, 18, 0.92) !important;
  }

  .wrap :global(.mapboxgl-ctrl-geocoder .suggestions > .active > a),
  .wrap :global(.mapboxgl-ctrl-geocoder .suggestions > li > a:hover) {
    background: rgba(255, 228, 130, 0.85) !important;
    color: rgba(30, 24, 8, 0.98) !important;
  }

  .wrap :global(.mapboxgl-ctrl-group) {
    background: rgba(255, 248, 220, 0.94) !important;
    border: 1px solid rgba(210, 175, 80, 0.45) !important;
    border-radius: 12px !important;
    box-shadow:
      0 6px 22px rgba(60, 45, 10, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
    overflow: hidden;
  }

  .wrap :global(.mapboxgl-ctrl-group button) {
    background-color: transparent !important;
    width: 36px;
    height: 36px;
  }

  .wrap :global(.mapboxgl-ctrl-group button:hover) {
    background-color: rgba(255, 228, 130, 0.55) !important;
  }

  .wrap :global(.mapboxgl-ctrl-group button + button) {
    border-top: 1px solid rgba(200, 170, 90, 0.35) !important;
  }

  .wrap :global(.mapboxgl-ctrl-group .mapboxgl-ctrl-icon) {
    filter: brightness(0) saturate(100%);
    opacity: 0.72;
  }

  .wrap :global(.mapboxgl-ctrl-icon) {
    filter: brightness(0) invert(1);
    opacity: 0.9;
  }

  .left-ui {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    width: min(280px, calc(100vw - 1.5rem));
    max-width: min(280px, calc(100vw - 1.5rem));
    pointer-events: none;
  }

  .geocoder-slot {
    width: 100%;
    pointer-events: auto;
    min-width: 0;
  }

  .filters-overlay {
    width: 100%;
    min-width: 0;
    pointer-events: none;
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
