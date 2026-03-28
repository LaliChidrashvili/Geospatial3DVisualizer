/**
 * Spatial day/night on the sphere: equirectangular raster aligned to lon/lat.
 * For each pixel, mu = dot(surface_normal, sun_direction) — cheap Lambert-style terminator.
 * Mapbox Standard land tiles are often unlit; this overlay darkens the night hemisphere with a soft twilight band.
 */
import SunCalc from "suncalc";

export const TERMINATOR_LAYER_ID = "terminator-day-night";
export const TERMINATOR_SOURCE_ID = "terminator-day-night-src";

/** Show overlay up to this zoom (globe + wide map); hide for street-level detail. */
export const TERMINATOR_OVERLAY_MAX_ZOOM = 9;

const WORLD_COORDS = /** @type {[[number, number], [number, number], [number, number], [number, number]]} */ ([
  [-180, 85],
  [180, 85],
  [180, -85],
  [-180, -85],
]);

/**
 * Subsolar point (max solar altitude) — one grid search per frame.
 */
function subsolarLatLng(date) {
  let bestLat = 0;
  let bestLng = 0;
  let bestAlt = -99;
  for (let lat = -90; lat <= 90; lat += 5) {
    for (let lng = -180; lng < 180; lng += 5) {
      const alt = SunCalc.getPosition(date, lat, lng).altitude;
      if (alt > bestAlt) {
        bestAlt = alt;
        bestLat = lat;
        bestLng = lng;
      }
    }
  }
  for (let dlat = -5; dlat <= 5; dlat += 0.5) {
    for (let dlng = -5; dlng <= 5; dlng += 0.5) {
      const lat = bestLat + dlat;
      const lng = bestLng + dlng;
      const alt = SunCalc.getPosition(date, lat, lng).altitude;
      if (alt > bestAlt) {
        bestAlt = alt;
        bestLat = lat;
        bestLng = lng;
      }
    }
  }
  return { lat: bestLat, lng: bestLng };
}

function surfaceUnitEcef(latDeg, lngDeg) {
  const φ = (latDeg * Math.PI) / 180;
  const λ = (lngDeg * Math.PI) / 180;
  const c = Math.cos(φ);
  return [c * Math.cos(λ), c * Math.sin(λ), Math.sin(φ)];
}

/** mu in [-1, 1]: cos(zenith); >0 day, <0 night, ~0 terminator */
function nightAlpha(mu) {
  const hi = 0.06;
  const lo = -0.1;
  const maxA = 0.58;
  if (mu >= hi) return 0;
  if (mu <= lo) return maxA;
  return maxA * (hi - mu) / (hi - lo);
}

/**
 * @param {Date} date
 * @param {number} w
 * @param {number} h
 */
export function buildTerminatorCanvas(date, w, h) {
  const { lat: slat, lng: slng } = subsolarLatLng(date);
  const sx = surfaceUnitEcef(slat, slng);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const img = ctx.createImageData(w, h);
  const data = img.data;

  let i = 0;
  for (let j = 0; j < h; j++) {
    const lat = 85 - (170 * (j + 0.5)) / h;
    for (let k = 0; k < w; k++) {
      const lon = -180 + (360 * (k + 0.5)) / w;
      const p = surfaceUnitEcef(lat, lon);
      const mu = sx[0] * p[0] + sx[1] * p[1] + sx[2] * p[2];
      const a = nightAlpha(mu);
      data[i] = 12;
      data[i + 1] = 18;
      data[i + 2] = 48;
      data[i + 3] = Math.round(a * 255);
      i += 4;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * @param {import('mapbox-gl').Map} map
 */
export function ensureTerminatorLayer(map) {
  if (map.getSource(TERMINATOR_SOURCE_ID)) return;

  const canvas = buildTerminatorCanvas(new Date(), 1024, 512);
  const url = canvas.toDataURL("image/png");

  map.addSource(TERMINATOR_SOURCE_ID, {
    type: "image",
    url,
    coordinates: WORLD_COORDS,
  });

  const beforeId = map.getStyle()?.layers?.find((l) => l.type === "symbol")?.id;
  map.addLayer(
    {
      id: TERMINATOR_LAYER_ID,
      type: "raster",
      source: TERMINATOR_SOURCE_ID,
      paint: {
        "raster-opacity": 0.92,
        "raster-fade-duration": 0,
        "raster-resampling": "linear",
      },
    },
    beforeId
  );
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {Date} date
 */
export function updateTerminatorOverlay(map, date) {
  const src = map.getSource(TERMINATOR_SOURCE_ID);
  if (!src || typeof src.updateImage !== "function") return;
  const canvas = buildTerminatorCanvas(date, 1024, 512);
  try {
    src.updateImage({ url: canvas.toDataURL("image/png") });
  } catch (e) {
    console.warn("Terminator overlay", e);
  }
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {boolean} show
 */
export function setTerminatorVisibility(map, show) {
  if (!map.getLayer(TERMINATOR_LAYER_ID)) return;
  try {
    map.setLayoutProperty(
      TERMINATOR_LAYER_ID,
      "visibility",
      show ? "visible" : "none"
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {import('mapbox-gl').Map} map
 */
export function removeTerminatorLayer(map) {
  if (map.getLayer(TERMINATOR_LAYER_ID)) map.removeLayer(TERMINATOR_LAYER_ID);
  if (map.getSource(TERMINATOR_SOURCE_ID)) map.removeSource(TERMINATOR_SOURCE_ID);
}
