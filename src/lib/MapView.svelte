<!--
  Map logic (pitch/zoom, etc.) lives here; there is no MapComponent.svelte in this project.
-->
<script>
  import { onMount, onDestroy } from "svelte";
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";
  import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
  import "@mapbox/mapbox-gl-geocoder/lib/mapbox-gl-geocoder.css";
  import { DateTime } from "luxon";
  import tzlookup from "tz-lookup";
  import SunCalc from "suncalc";
  import EducationFiltersOverlay from "./EducationFiltersOverlay.svelte";
  import {
    GLOBE_LIGHT_ZOOM,
    applyGlobeFog,
    applyGlobeSunLights,
    restoreStyleFogAndLights,
  } from "./mapGlobeLighting.js";
  import {
    TERMINATOR_OVERLAY_MAX_ZOOM,
    ensureTerminatorLayer,
    removeTerminatorLayer,
    setTerminatorVisibility,
    updateTerminatorOverlay,
  } from "./terminatorRaster.js";
  import {
    ensureEducationLayers,
    setEducationVisibility,
    removeEducationLayers,
    setEducationHighlightFadeOpacity,
    syncEducationExtrusionNightStyle,
  } from "./educationLayers.js";

  let container;
  /** @type {HTMLDivElement | undefined} */
  let geocoderSlot;
  let map;
  let errorMessage = "";
  let syncPitchRaf = 0;
  /** @type {unknown} */
  let geocoderControl = null;
  /** While true, skip auto pitch/bearing sync so flyTo / city animations are not overwritten */
  let skipPitchSyncForSearch = false;

  let mapLoaded = false;
  /** Incremented to ignore stale moveend / fade from a previous city fly */
  let cityFlyGeneration = 0;
  /** @type {number} */
  let educationFadeRaf = 0;

  /** Set in onMount — city shortcut buttons */
  let flyToTbilisi = () => {};
  let flyToRustavi = () => {};
  let cancelEducationFadeLoop = () => {};

  /** @type {ReturnType<typeof setInterval> | undefined} */
  let basemapLightingIntervalId = undefined;

  /** Last basemap light preset — refresh highlight opacities when it changes */
  let previousEduLightPreset = "";

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  /** Geocoder result labels: not the search language — you can type Latin or Georgian. Comma-separated IETF tags (e.g. en,ka). See VITE_GEOCODER_LANGUAGE in .env.example */
  const geocoderLanguage =
    import.meta.env.VITE_GEOCODER_LANGUAGE || "en,ka";

  /** When true, use Mercator only (flat map); no globe — stable centering, no 3D globe view. */
  const USE_FLAT_MAP_ONLY = false;

  const SEARCH_FLY_ZOOM = 17;
  const SEARCH_FLY_PITCH = 55;
  const SEARCH_FLY_BEARING = -25;

  /**
   * Initial camera — Rustavi, Zakaria Paliashvili area near Public Service Hall
   * (OSM: ~41.55593, 44.98404) so the street and Justice House vicinity match the app screenshot.
   */
  const INITIAL_CENTER = /** @type {[number, number]} */ ([44.9840431, 41.5559346]);
  const INITIAL_ZOOM = 16.5;
  const INITIAL_PITCH = 55;
  /** Slight leftward map rotation (matches typical 3D street framing). */
  const INITIAL_BEARING = -12;

  /** How often to re-apply lighting if the app stays open across time-of-day boundaries */
  const BASEMAP_LIGHTING_INTERVAL_MS = 60 * 1000;

  function basemapLightPresetForHour(hour) {
    if (hour >= 6 && hour < 11) return "dawn";
    if (hour >= 11 && hour < 18) return "day";
    if (hour >= 18 && hour < 21) return "dusk";
    return "night";
  }

  function localHourAtLngLat(lat, lng) {
    let zone = "UTC";
    try {
      zone = tzlookup(lat, lng);
    } catch {
      /* invalid coords */
    }
    return DateTime.now().setZone(zone).hour;
  }

  /**
   * Four Standard presets from solar geometry at map center (UTC).
   * @param {number} lat
   * @param {number} lng
   * @param {Date} [date]
   */
  function basemapLightPresetForSolar(lat, lng, date = new Date()) {
    try {
      const pos = SunCalc.getPosition(date, lat, lng);
      const altDeg = (pos.altitude * 180) / Math.PI;
      if (!Number.isFinite(altDeg)) {
        return basemapLightPresetForHour(localHourAtLngLat(lat, lng));
      }
      const times = SunCalc.getTimes(date, lat, lng);
      const noonMs = times.solarNoon.getTime();
      if (!Number.isFinite(noonMs)) {
        return basemapLightPresetForHour(localHourAtLngLat(lat, lng));
      }
      const beforeNoon = date.getTime() < noonMs;
      if (altDeg > 8) return "day";
      if (altDeg > 0) return beforeNoon ? "dawn" : "dusk";
      if (altDeg > -6) return beforeNoon ? "dawn" : "dusk";
      return "night";
    } catch {
      return basemapLightPresetForHour(localHourAtLngLat(lat, lng));
    }
  }

  /**
   * Basemap config, optional globe lights/fog, raster day/night overlay on sphere/world.
   * @param {import('mapbox-gl').Map} m
   * @param {import('mapbox-gl').FogSpecification | undefined} fogBackup
   * @param {Array<import('mapbox-gl').LightsSpecification> | undefined} lightsBackup
   */
  function updateMapLight(m, fogBackup, lightsBackup) {
    if (!m || typeof m.setConfigProperty !== "function") return;
    const c = m.getCenter();
    const now = new Date();
    const preset = basemapLightPresetForSolar(c.lat, c.lng, now);
    const z = m.getZoom();
    const presetChangedForHighlights =
      mapLoaded && preset !== previousEduLightPreset;

    try {
      m.setConfigProperty("basemap", "lightPreset", preset);
      m.setConfigProperty("basemap", "show3dObjects", true);
      m.setConfigProperty("basemap", "showPointOfInterestLabels", true);
      try {
        m.setConfigProperty("basemap", "showPlaceLabels", true);
      } catch {
        /* optional */
      }
    } catch (e) {
      console.warn("Basemap lighting", e);
    }

    if (z < GLOBE_LIGHT_ZOOM) {
      applyGlobeFog(m, preset);
      applyGlobeSunLights(m, now, preset, c.lat, c.lng);
    } else {
      restoreStyleFogAndLights(m, fogBackup, lightsBackup);
    }

    const showTerminator = z <= TERMINATOR_OVERLAY_MAX_ZOOM;
    setTerminatorVisibility(m, showTerminator);
    if (showTerminator) {
      updateTerminatorOverlay(m, now);
    }

    syncEducationExtrusionNightStyle(m, preset);
    if (presetChangedForHighlights) {
      setEducationHighlightFadeOpacity(m, 1);
    }
    previousEduLightPreset = preset;
  }

  /**
   * @param {Record<string, unknown> & { geometry?: GeoJSON.Geometry }} f Geocoder result feature
   * @returns {[number, number] | null}
   */
  function centerFromGeocoderResult(f) {
    const c = f.center;
    if (Array.isArray(c) && c.length >= 2) {
      return [Number(c[0]), Number(c[1])];
    }
    const g = f.geometry;
    if (g && g.type === "Point" && Array.isArray(g.coordinates)) {
      const [lng, lat] = g.coordinates;
      return [Number(lng), Number(lat)];
    }
    const b = f.bbox;
    if (Array.isArray(b) && b.length >= 4) {
      return [(Number(b[0]) + Number(b[2])) / 2, (Number(b[1]) + Number(b[3])) / 2];
    }
    return null;
  }

  onMount(() => {
    if (!token) {
      errorMessage =
        "Set VITE_MAPBOX_ACCESS_TOKEN in a .env file at the project root (Mapbox public token).";
      return;
    }

    mapboxgl.accessToken = token;

    const initialLightPreset = basemapLightPresetForSolar(
      INITIAL_CENTER[1],
      INITIAL_CENTER[0]
    );

    let styleFogBackup = /** @type {import('mapbox-gl').FogSpecification | undefined} */ (
      undefined
    );
    let styleLightsBackup = /** @type {Array<import('mapbox-gl').LightsSpecification> | undefined} */ (
      undefined
    );

    // Mapbox Standard has no legacy "composite" source; 3D objects use Standard style config.
    map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/standard",
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      antialias: true,
      ...(USE_FLAT_MAP_ONLY ? { projection: "mercator" } : {}),
      config: {
        basemap: {
          show3dObjects: true,
          lightPreset: initialLightPreset,
          showPointOfInterestLabels: true,
          showPlaceLabels: true,
        },
      },
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false,
      placeholder: "Search (e.g. Bob Walsh Street, Tbilisi)",
      types: "place,address,poi",
      proximity: "ip",
      // Do not override proximity with map center while moving
      trackProximity: false,
      limit: 10,
      language: geocoderLanguage,
      // Default is 2 — show suggestions from the first character
      minLength: 1,
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

      const center = centerFromGeocoderResult(
        /** @type {Record<string, unknown> & { geometry?: GeoJSON.Geometry }} */ (f)
      );
      if (!center) {
        finishSearchNavigation();
        return;
      }

      map.flyTo({
        center,
        zoom: SEARCH_FLY_ZOOM,
        pitch: SEARCH_FLY_PITCH,
        bearing: SEARCH_FLY_BEARING,
        duration: 2200,
        essential: true,
      });
    });

    const geocoderEl = geocoder.onAdd(map);
    if (geocoderSlot) {
      geocoderSlot.appendChild(geocoderEl);
    }
    geocoderControl = geocoder;

    const Z_GLOBE = 5;
    const Z_TILT_START = 13;
    const Z_TILT_FULL = 17;
    const PITCH_3D_MIN = 45;
    const PITCH_3D_MAX = 55;
    const HIGH_BEARING = -25;

    function targetPitchBearingForZoom(z) {
      if (z < Z_GLOBE) {
        return { pitch: 0, bearing: 0 };
      }
      if (z <= Z_TILT_START) {
        return { pitch: 0, bearing: 0 };
      }
      const t = Math.min(
        1,
        Math.max(0, (z - Z_TILT_START) / (Z_TILT_FULL - Z_TILT_START))
      );
      return {
        pitch: PITCH_3D_MIN + t * (PITCH_3D_MAX - PITCH_3D_MIN),
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

    const CITY_FADE_MS = 3000;

    cancelEducationFadeLoop = () => {
      if (educationFadeRaf) {
        cancelAnimationFrame(educationFadeRaf);
        educationFadeRaf = 0;
      }
    };

    function fadeEducationHighlightsIn(durationMs, onDone) {
      cancelEducationFadeLoop();
      const start = performance.now();
      function step(/** @type {number} */ now) {
        const t = Math.min(1, (now - start) / durationMs);
        const s = t * t * (3 - 2 * t);
        setEducationHighlightFadeOpacity(map, s);
        if (t < 1) {
          educationFadeRaf = requestAnimationFrame(step);
        } else {
          educationFadeRaf = 0;
          onDone?.();
        }
      }
      educationFadeRaf = requestAnimationFrame(step);
    }

    /** @param {Object} opts Mapbox flyTo options */
    function flyToCity(opts) {
      if (!map || !mapLoaded) return;
      cityFlyGeneration += 1;
      const gen = cityFlyGeneration;
      cancelEducationFadeLoop();
      skipPitchSyncForSearch = true;
      setEducationHighlightFadeOpacity(map, 0);
      map.flyTo(opts);
      map.once("moveend", () => {
        if (gen !== cityFlyGeneration) return;
        fadeEducationHighlightsIn(CITY_FADE_MS, () => {
          if (gen !== cityFlyGeneration) return;
          skipPitchSyncForSearch = false;
          syncPitchBearingToZoom();
        });
      });
    }

    flyToTbilisi = () =>
      flyToCity({
        center: [44.793, 41.715],
        zoom: 16.5,
        pitch: 55,
        bearing: -15,
        duration: 3000,
        essential: true,
      });

    flyToRustavi = () =>
      flyToCity({
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        pitch: INITIAL_PITCH,
        bearing: INITIAL_BEARING,
        duration: 3000,
        essential: true,
      });

    map.on("load", () => {
      map.resize();
      try {
        styleFogBackup = map.getFog() ?? undefined;
        styleLightsBackup = map.getLights() ?? undefined;
      } catch {
        /* ignore */
      }
      try {
        ensureTerminatorLayer(map);
      } catch (e) {
        console.warn("Terminator overlay", e);
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
      updateMapLight(map, styleFogBackup, styleLightsBackup);
      if (basemapLightingIntervalId !== undefined) {
        clearInterval(basemapLightingIntervalId);
      }
      basemapLightingIntervalId = setInterval(
        () => updateMapLight(map, styleFogBackup, styleLightsBackup),
        BASEMAP_LIGHTING_INTERVAL_MS
      );
      mapLoaded = true;
      setEducationHighlightFadeOpacity(map, 1);
    });

    map.once("idle", () => {
      map.resize();
    });

    map.on("zoom", scheduleSyncPitchBearing);
    map.on("zoomend", () => {
      syncPitchBearingToZoom();
      updateMapLight(map, styleFogBackup, styleLightsBackup);
    });

    map.on("moveend", () => {
      updateMapLight(map, styleFogBackup, styleLightsBackup);
    });

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
    if (basemapLightingIntervalId !== undefined) {
      clearInterval(basemapLightingIntervalId);
      basemapLightingIntervalId = undefined;
    }
    if (syncPitchRaf) cancelAnimationFrame(syncPitchRaf);
    syncPitchRaf = 0;
    cancelEducationFadeLoop();
    if (geocoderControl) {
      geocoderControl.onRemove();
      geocoderControl = null;
    }
    if (map) {
      try {
        removeTerminatorLayer(map);
      } catch {
        /* ignore */
      }
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
      <div
        class="city-switcher"
        role="group"
        aria-label="City shortcuts"
      >
        <button
          type="button"
          class="city-btn"
          title="Fly to Tbilisi"
          on:click={flyToTbilisi}
        >
          Tbilisi
        </button>
        <button
          type="button"
          class="city-btn"
          title="Fly to Rustavi"
          on:click={flyToRustavi}
        >
          Rustavi
        </button>
      </div>
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

  .city-switcher {
    display: flex;
    gap: 0.4rem;
    padding: 0.45rem 0.5rem;
    border-radius: 10px;
    background: rgba(255, 248, 220, 0.55);
    border: 1px solid rgba(210, 175, 80, 0.4);
    box-shadow: 0 4px 18px rgba(60, 45, 10, 0.12);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    pointer-events: auto;
  }

  .city-btn {
    flex: 1;
    min-width: 0;
    padding: 0.4rem 0.5rem;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(35, 30, 12, 0.92);
    background: rgba(255, 255, 255, 0.45);
    border: 1px solid rgba(180, 150, 70, 0.35);
    border-radius: 8px;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.12s ease;
  }

  .city-btn:hover {
    background: rgba(255, 255, 255, 0.75);
    border-color: rgba(160, 130, 50, 0.5);
  }

  .city-btn:active {
    transform: scale(0.98);
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
