/**
 * Globe: extra directional lights + fog after `lightPreset` (Mapbox Standard).
 * See MapView + terminatorRaster for spatial day/night on the map surface.
 */
import SunCalc from "suncalc";

export const GLOBE_LIGHT_ZOOM = 5.5;

const MAX_I = 1;

function azimuthNorthDegFromSunCalc(azimuthSouthWestRad) {
  const bearingRad = Math.PI + azimuthSouthWestRad;
  const wrapped =
    ((bearingRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return (wrapped * 180) / Math.PI;
}

function mapboxPolarFromAltitude(altitudeRad) {
  const elevDeg = (altitudeRad * 180) / Math.PI;
  const polar = 90 - elevDeg;
  return Math.min(90, Math.max(0, polar));
}

export function mapboxSunDirectionAt(date, lat, lng) {
  const pos = SunCalc.getPosition(date, lat, lng);
  const az = azimuthNorthDegFromSunCalc(pos.azimuth);
  const polar = mapboxPolarFromAltitude(pos.altitude);
  return [((az % 360) + 360) % 360, polar];
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {Date} [date]
 * @param {"dawn"|"day"|"dusk"|"night"} [preset]
 * @param {number} [centerLat]
 * @param {number} [centerLng]
 */
export function applyGlobeSunLights(
  map,
  date = new Date(),
  preset = "day",
  centerLat = 0,
  centerLng = 0
) {
  const [azSun, polSun] = mapboxSunDirectionAt(date, centerLat, centerLng);
  const azFill = (azSun + 180) % 360;
  const polFill = Math.min(90, polSun + 8);

  const nightSide = preset === "night";
  const twilight = preset === "dawn" || preset === "dusk";
  const sunInt = nightSide ? 0.88 : twilight ? 0.96 : MAX_I;
  const fillInt = nightSide ? 0.2 : twilight ? 0.34 : 0.3;
  const ambInt = nightSide ? 0.06 : twilight ? 0.1 : 0.08;

  try {
    map.setLights([
      {
        id: "ambient-globe",
        type: "ambient",
        properties: {
          color: nightSide ? "#5a6a88" : twilight ? "#a8a8c0" : "#8fa0c0",
          intensity: ambInt,
        },
      },
      {
        id: "sun-globe",
        type: "directional",
        properties: {
          color: twilight ? "#ffe8cc" : "#fff4e6",
          intensity: sunInt,
          direction: [azSun, polSun],
          "cast-shadows": true,
          "shadow-intensity": nightSide ? 0.5 : 0.68,
        },
      },
      {
        id: "fill-globe",
        type: "directional",
        properties: {
          color: "#6a7fa0",
          intensity: fillInt,
          direction: [azFill, polFill],
        },
      },
    ]);
  } catch (e) {
    console.warn("Globe sun lights", e);
  }
}

const GLOBE_FOG_BY_PRESET = {
  dawn: {
    color: "rgb(198, 178, 165)",
    "high-color": "rgb(110, 130, 205)",
    "horizon-blend": 0.18,
    "space-color": "rgb(8, 10, 26)",
    "star-intensity": 0.22,
  },
  day: {
    color: "rgb(128, 156, 200)",
    "high-color": "rgb(40, 84, 175)",
    "horizon-blend": 0.15,
    "space-color": "rgb(5, 7, 20)",
    "star-intensity": 0.3,
  },
  dusk: {
    color: "rgb(185, 135, 125)",
    "high-color": "rgb(85, 55, 135)",
    "horizon-blend": 0.18,
    "space-color": "rgb(10, 8, 24)",
    "star-intensity": 0.34,
  },
  night: {
    color: "rgb(72, 88, 118)",
    "high-color": "rgb(28, 38, 72)",
    "horizon-blend": 0.14,
    "space-color": "rgb(4, 5, 14)",
    "star-intensity": 0.5,
  },
};

export function applyGlobeFog(map, preset) {
  const spec = GLOBE_FOG_BY_PRESET[preset] ?? GLOBE_FOG_BY_PRESET.day;
  try {
    map.setFog(spec);
  } catch (e) {
    console.warn("Globe fog", e);
  }
}

export function restoreStyleFogAndLights(map, fog, lights) {
  try {
    if (fog !== undefined) map.setFog(fog ?? null);
  } catch {
    /* ignore */
  }
  try {
    if (lights !== undefined) map.setLights(lights ?? null);
  } catch {
    /* ignore */
  }
}
