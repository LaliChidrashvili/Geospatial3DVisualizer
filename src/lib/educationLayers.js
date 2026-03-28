/**
 * Education highlights — Mapbox Standard + mapbox-streets-v8.
 * Hybrid: building fill-extrusion + poi_label circles (school / kindergarten / university)
 * where footprints or 3D extrusion are missing. Dusk/night colors match per category:
 * the same fill/stroke/halo logic applies to POI-only points as to building coverage.
 *
 * Dusk/night “neon”: emissive + flood-light (style spec), not `fill-extrusion-lighting-color`.
 * Extra glow layers sit under the main extrusion for softer bloom.
 */

export const SOURCE_ID = "streets-education-highlight";

/** Default building height (m) when the tile has no height property */
export const DEFAULT_BUILDING_HEIGHT_M = 15;

/** Extra meters above roof for highlighted education buildings */
const HIGHLIGHT_ROOF_CAP_M = 6;

const LAYERS = {
  schoolBuildingGlow: "edu-highlight-bldg-school-glow",
  schoolBuilding: "edu-highlight-bldg-school",
  uniBuildingGlow: "edu-highlight-bldg-uni-glow",
  uniBuilding: "edu-highlight-bldg-university",
  kinderBuildingGlow: "edu-highlight-bldg-kinder-glow",
  kinderBuilding: "edu-highlight-bldg-kinder",
  schoolPoiHalo: "edu-highlight-poi-school-halo",
  schoolPoi: "edu-highlight-poi-school",
  uniPoiHalo: "edu-highlight-poi-uni-halo",
  uniPoi: "edu-highlight-poi-uni",
  kinderPoiHalo: "edu-highlight-poi-kinder-halo",
  kinderPoi: "edu-highlight-poi-kinder",
  /** Night “bulb” POI — same filters; stacked above other circles (below map symbols) */
  schoolPoiLamp: "edu-poi-school-lamp",
  kinderPoiLamp: "edu-poi-kinder-lamp",
  uniPoiLamp: "edu-poi-uni-lamp",
};

/** Main geometry only (no halos / glow) — for hover tooltips & hit-testing. */
export const EDUCATION_TOOLTIP_LAYER_IDS = [
  LAYERS.schoolBuilding,
  LAYERS.uniBuilding,
  LAYERS.kinderBuilding,
  LAYERS.schoolPoi,
  LAYERS.uniPoi,
  LAYERS.kinderPoi,
  LAYERS.schoolPoiLamp,
  LAYERS.kinderPoiLamp,
  LAYERS.uniPoiLamp,
];

/** 3D fill-extrusion (main only) — queried before POI so footprints register hits. */
export const EDUCATION_BUILDING_LAYER_IDS = [
  LAYERS.schoolBuilding,
  LAYERS.uniBuilding,
  LAYERS.kinderBuilding,
];

/** poi_label circles + night lamps — second pass for tooltips / name fallback. */
export const EDUCATION_POI_TOOLTIP_LAYER_IDS = [
  LAYERS.schoolPoi,
  LAYERS.uniPoi,
  LAYERS.kinderPoi,
  LAYERS.schoolPoiLamp,
  LAYERS.kinderPoiLamp,
  LAYERS.uniPoiLamp,
];

/** Last basemap lightPreset applied — used when fading highlights after flyTo */
let lastBasemapLightPreset = "day";

/** School / kindergarten / university extrusion — day colors */
const COLOR_SCHOOL_DAY = "#ffeb3b";
const COLOR_KINDER_DAY = "#ff9800";
const COLOR_UNI_DAY = "#2196f3";

/** Brighter “neon” fills for dusk / night (high luminance on dark basemap) */
const COLOR_SCHOOL_NIGHT = "#eeff41";
/** Amber / gold neon — reads as “orange” but stays bright at night */
const COLOR_KINDER_NIGHT = "#ffca28";
/** Electric cyan-blue — navy (#2196f3) goes black under night lights */
const COLOR_UNI_NIGHT = "#40c4ff";

/** Underlay “bloom” layer (stacked below main extrusion) */
const COLOR_SCHOOL_GLOW_NIGHT = "#ffff8f";
const COLOR_KINDER_GLOW_NIGHT = "#ffe082";
const COLOR_UNI_GLOW_NIGHT = "#b3e5fc";

/**
 * Dusk/night — one palette per category for extrusion + POI (dot-only addresses use POI paint).
 */
const NIGHT_PALETTE = {
  school: {
    fill: COLOR_SCHOOL_NIGHT,
    glowExtrusion: COLOR_SCHOOL_GLOW_NIGHT,
    flood: "#fffde7",
    poiStroke: "#f5ffab",
    poiHalo: "#ffff8f",
  },
  uni: {
    fill: COLOR_UNI_NIGHT,
    glowExtrusion: COLOR_UNI_GLOW_NIGHT,
    flood: "#e1f5fe",
    poiStroke: "#e3f2fd",
    poiHalo: "#4fc3f7",
  },
  kinder: {
    fill: COLOR_KINDER_NIGHT,
    glowExtrusion: COLOR_KINDER_GLOW_NIGHT,
    flood: "#fff8e1",
    poiStroke: "#ffe082",
    poiHalo: "#ffb74d",
  },
};

const NIGHT_AO_INTENSITY = 0.7;
/** Main 3D extrusion walls (not glow underlay) — user-tuned for readable neon without blow-out */
const NIGHT_EMISSIVE_MAIN = 0.8;
const NIGHT_FLOOD_INTENSITY = 0.58;
const NIGHT_FLOOD_WALL_M = 14;
const NIGHT_FLOOD_GROUND_M = 22;
const NIGHT_GLOW_EMISSIVE = 2.35;
const NIGHT_GLOW_FLOOD_INTENSITY = 0.72;

/** POI “bulb” layer — Mapbox circle-emissive-strength (when supported) */
const NIGHT_POI_LAMP_EMISSIVE = 1;
const NIGHT_POI_LAMP_RADIUS = 8;
const NIGHT_POI_LAMP_BLUR = 1;

/** Max opacity for glow underlay extrusion when dusk/night */
export const EDUCATION_GLOW_OPACITY_FULL = 0.48;

/** Soft POI “bloom” under school / kinder dots (dusk/night only) */
const EDUCATION_SCHOOL_POI_HALO_OPACITY = 0.58;
const EDUCATION_UNI_POI_HALO_OPACITY = 0.58;
const EDUCATION_KINDER_POI_HALO_OPACITY = 0.55;

/** Kindergarten / preschool building footprint */
const FILTER_KINDER_BUILDING = [
  "any",
  ["==", ["get", "class"], "kindergarten"],
  ["==", ["get", "type"], "kindergarten"],
  ["==", ["get", "class"], "preschool"],
  ["==", ["get", "type"], "preschool"],
  ["==", ["get", "type"], "childcare"],
  ["==", ["get", "class"], "childcare"],
];

/**
 * poi_label: kindergartens often appear here with maki=school + category, or extra class values.
 * Excludes university/college POIs.
 */
const KINDER_CATEGORY_LITERAL = [
  "literal",
  [
    "Kindergarten",
    "kindergarten",
    "Preschool",
    "preschool",
    "Nursery",
    "nursery",
    "Childcare",
    "childcare",
    "Day care",
    "day care",
  ],
];

const FILTER_KINDER_POI = [
  "all",
  [
    "any",
    ["==", ["get", "class"], "kindergarten"],
    ["==", ["get", "type"], "kindergarten"],
    ["==", ["get", "class"], "preschool"],
    ["==", ["get", "type"], "preschool"],
    ["==", ["get", "class"], "childcare"],
    ["==", ["get", "type"], "childcare"],
    ["==", ["get", "type"], "nursery"],
    ["==", ["get", "maki"], "kindergarten"],
    ["in", ["get", "category_en"], KINDER_CATEGORY_LITERAL],
    [
      "all",
      ["==", ["get", "maki"], "school"],
      [
        "any",
        ["in", ["get", "category_en"], KINDER_CATEGORY_LITERAL],
        ["==", ["get", "type"], "kindergarten"],
        ["==", ["get", "type"], "childcare"],
        ["==", ["get", "class"], "kindergarten"],
        ["==", ["get", "class"], "preschool"],
      ],
    ],
  ],
  ["!", ["in", ["get", "type"], ["literal", ["university", "college"]]]],
];

/** Exclude tertiary / research — otherwise they get caught by school rules */
const FILTER_EXCLUDE_UNI_COLLEGE_POI = [
  "any",
  ["==", ["get", "type"], "university"],
  ["==", ["get", "type"], "college"],
  ["==", ["get", "class"], "university"],
  ["==", ["get", "class"], "college"],
  ["in", ["get", "maki"], ["literal", ["college", "university"]]],
];

/** poi_label: K–12 / general school POIs, excluding kindergarten-style POIs */
const FILTER_SCHOOL_POI = [
  "all",
  [
    "any",
    ["==", ["get", "type"], "school"],
    ["==", ["get", "class"], "school"],
    ["==", ["get", "maki"], "school"],
  ],
  ["!", FILTER_KINDER_POI],
  ["!", FILTER_EXCLUDE_UNI_COLLEGE_POI],
];

/** poi_label: universities / colleges when no building match */
const FILTER_UNI_POI = [
  "any",
  ["==", ["get", "type"], "university"],
  ["==", ["get", "class"], "university"],
  ["==", ["get", "type"], "college"],
  ["==", ["get", "class"], "college"],
  ["in", ["get", "maki"], ["literal", ["college", "university"]]],
];

/**
 * Schools: explicit school only — NOT `class=education` (Mapbox tags almost all campuses
 * that way, so everything became yellow).
 */
const FILTER_SCHOOL_BUILDING = [
  "all",
  [
    "any",
    ["==", ["get", "type"], "school"],
    ["==", ["get", "class"], "school"],
  ],
  ["!", ["in", ["get", "type"], ["literal", ["university", "college"]]]],
  ["!", ["in", ["get", "class"], ["literal", ["university", "college"]]]],
];

/** Universities + college footprints (same highlight style) */
const FILTER_UNI_BUILDING = [
  "any",
  ["==", ["get", "type"], "university"],
  ["==", ["get", "type"], "college"],
  ["==", ["get", "class"], "university"],
  ["==", ["get", "class"], "college"],
];

function roofHeightExpr() {
  return ["coalesce", ["get", "height"], DEFAULT_BUILDING_HEIGHT_M];
}

function applyExtrusionHeightFromData(map, layerId) {
  if (!map.getLayer(layerId)) return;
  const roof = roofHeightExpr();
  map.setPaintProperty(layerId, "fill-extrusion-base", roof);
  map.setPaintProperty(
    layerId,
    "fill-extrusion-height",
    ["+", roof, HIGHLIGHT_ROOF_CAP_M]
  );
}

function extrusionPaint(color) {
  const roof = roofHeightExpr();
  return {
    "fill-extrusion-color": color,
    "fill-extrusion-opacity": 0.92,
    "fill-extrusion-base": roof,
    "fill-extrusion-height": ["+", roof, HIGHLIGHT_ROOF_CAP_M],
    "fill-extrusion-edge-radius": 0.18,
  };
}

/**
 * Underlay extrusion for emissive / flood-light bloom (same geometry, drawn below main).
 * @param {string} nightNeonColor
 */
function glowExtrusionPaintInitial(nightNeonColor) {
  const roof = roofHeightExpr();
  return {
    "fill-extrusion-color": nightNeonColor,
    "fill-extrusion-opacity": 0,
    "fill-extrusion-base": roof,
    "fill-extrusion-height": ["+", roof, HIGHLIGHT_ROOF_CAP_M],
    "fill-extrusion-edge-radius": 0.22,
  };
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {string} layerId
 * @param {string} prop
 * @param {unknown} value
 */
function trySetPaint(map, layerId, prop, value) {
  if (!map.getLayer(layerId)) return;
  try {
    map.setPaintProperty(layerId, prop, value);
  } catch {
    /* unsupported in this GL / style combo */
  }
}

/**
 * Mapbox Standard: emissive + flood-light read as “neon” on walls; not `fill-extrusion-lighting-color` (not in spec).
 * @param {import('mapbox-gl').Map} map
 * @param {string} layerId
 * @param {boolean} on
 * @param {{ main: string; flood: string }} colors
 */
function setExtrusionNeonLighting(map, layerId, on, colors) {
  trySetPaint(map, layerId, "fill-extrusion-emissive-strength", on ? NIGHT_EMISSIVE_MAIN : 0);
  trySetPaint(map, layerId, "fill-extrusion-flood-light-color", on ? colors.flood : "#ffffff");
  trySetPaint(map, layerId, "fill-extrusion-flood-light-intensity", on ? NIGHT_FLOOD_INTENSITY : 0);
  trySetPaint(map, layerId, "fill-extrusion-flood-light-wall-radius", on ? NIGHT_FLOOD_WALL_M : 0);
  trySetPaint(map, layerId, "fill-extrusion-flood-light-ground-radius", on ? NIGHT_FLOOD_GROUND_M : 0);
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {string} layerId
 * @param {boolean} on
 */
function setExtrusionAmbientOcclusion(map, layerId, on) {
  trySetPaint(
    map,
    layerId,
    "fill-extrusion-ambient-occlusion-intensity",
    on ? NIGHT_AO_INTENSITY : 0
  );
  trySetPaint(map, layerId, "fill-extrusion-ambient-occlusion-wall-radius", on ? 5 : 0);
  trySetPaint(map, layerId, "fill-extrusion-ambient-occlusion-ground-radius", on ? 10 : 0);
}

/** English label used to match building ↔ POI for cross-highlight (stroke boost). */
let educationPoiHoverMatchName = null;

const EDUCATION_POI_HOVER_STROKE_LAYERS = [
  LAYERS.schoolPoi,
  LAYERS.uniPoi,
  LAYERS.kinderPoi,
  LAYERS.schoolPoiLamp,
  LAYERS.kinderPoiLamp,
  LAYERS.uniPoiLamp,
];

/**
 * @param {string} lit
 * @returns {unknown[]}
 */
function nameMatchPaintLiteral(lit) {
  return [
    "any",
    ["==", ["get", "name"], ["literal", lit]],
    ["==", ["get", "name_en"], ["literal", lit]],
    ["==", ["get", "name:en"], ["literal", lit]],
    ["==", ["get", "name:ka"], ["literal", lit]],
    ["==", ["get", "short_name"], ["literal", lit]],
  ];
}

/**
 * Re-apply POI stroke after sync — keeps hover ring if `educationPoiHoverMatchName` is set.
 * @param {import('mapbox-gl').Map} map
 */
function applyEducationPoiHoverStroke(map) {
  const low = lastBasemapLightPreset === "dusk" || lastBasemapLightPreset === "night";
  const baseStroke = low ? 3 : 2;
  const hiStroke = baseStroke + 4;
  const match = educationPoiHoverMatchName;
  for (const id of EDUCATION_POI_HOVER_STROKE_LAYERS) {
    if (!map.getLayer(id)) continue;
    if (match) {
      map.setPaintProperty(id, "circle-stroke-width", [
        "case",
        nameMatchPaintLiteral(match),
        hiStroke,
        baseStroke,
      ]);
    } else {
      map.setPaintProperty(id, "circle-stroke-width", baseStroke);
    }
  }
}

/**
 * Cross-highlight POI circles when hovering the matching 3D footprint (or POI with same English label).
 * @param {import('mapbox-gl').Map} map
 * @param {string | null} englishName
 */
export function setEducationPoiHoverMatch(map, englishName) {
  educationPoiHoverMatchName =
    englishName && String(englishName).trim() ? String(englishName).trim() : null;
  applyEducationPoiHoverStroke(map);
}

/**
 * Sync school/kinder 3D highlights with basemap light preset (dusk/night = neon + AO + glow).
 * @param {import('mapbox-gl').Map} map
 * @param {string} preset basemap `lightPreset`: dawn | day | dusk | night
 */
export function syncEducationExtrusionNightStyle(map, preset) {
  lastBasemapLightPreset = preset;
  const low = preset === "dusk" || preset === "night";

  const schoolMain = {
    fill: NIGHT_PALETTE.school.fill,
    flood: NIGHT_PALETTE.school.flood,
  };
  const uniMain = {
    fill: NIGHT_PALETTE.uni.fill,
    flood: NIGHT_PALETTE.uni.flood,
  };
  const kinderMain = {
    fill: NIGHT_PALETTE.kinder.fill,
    flood: NIGHT_PALETTE.kinder.flood,
  };

  if (map.getLayer(LAYERS.schoolBuilding)) {
    trySetPaint(
      map,
      LAYERS.schoolBuilding,
      "fill-extrusion-color",
      low ? schoolMain.fill : COLOR_SCHOOL_DAY
    );
    setExtrusionAmbientOcclusion(map, LAYERS.schoolBuilding, low);
    setExtrusionNeonLighting(map, LAYERS.schoolBuilding, low, schoolMain);
  }

  if (map.getLayer(LAYERS.uniBuilding)) {
    trySetPaint(
      map,
      LAYERS.uniBuilding,
      "fill-extrusion-color",
      low ? uniMain.fill : COLOR_UNI_DAY
    );
    setExtrusionAmbientOcclusion(map, LAYERS.uniBuilding, low);
    setExtrusionNeonLighting(map, LAYERS.uniBuilding, low, uniMain);
  }

  if (map.getLayer(LAYERS.kinderBuilding)) {
    trySetPaint(
      map,
      LAYERS.kinderBuilding,
      "fill-extrusion-color",
      low ? kinderMain.fill : COLOR_KINDER_DAY
    );
    setExtrusionAmbientOcclusion(map, LAYERS.kinderBuilding, low);
    setExtrusionNeonLighting(map, LAYERS.kinderBuilding, low, kinderMain);
  }

  if (map.getLayer(LAYERS.schoolBuildingGlow)) {
    trySetPaint(
      map,
      LAYERS.schoolBuildingGlow,
      "fill-extrusion-color",
      low ? NIGHT_PALETTE.school.glowExtrusion : COLOR_SCHOOL_DAY
    );
    setExtrusionAmbientOcclusion(map, LAYERS.schoolBuildingGlow, low);
    trySetPaint(
      map,
      LAYERS.schoolBuildingGlow,
      "fill-extrusion-emissive-strength",
      low ? NIGHT_GLOW_EMISSIVE : 0
    );
    trySetPaint(map, LAYERS.schoolBuildingGlow, "fill-extrusion-flood-light-color", "#ffffcc");
    trySetPaint(
      map,
      LAYERS.schoolBuildingGlow,
      "fill-extrusion-flood-light-intensity",
      low ? NIGHT_GLOW_FLOOD_INTENSITY : 0
    );
    trySetPaint(
      map,
      LAYERS.schoolBuildingGlow,
      "fill-extrusion-flood-light-wall-radius",
      low ? NIGHT_FLOOD_WALL_M + 4 : 0
    );
    trySetPaint(
      map,
      LAYERS.schoolBuildingGlow,
      "fill-extrusion-flood-light-ground-radius",
      low ? NIGHT_FLOOD_GROUND_M + 6 : 0
    );
  }

  if (map.getLayer(LAYERS.uniBuildingGlow)) {
    trySetPaint(
      map,
      LAYERS.uniBuildingGlow,
      "fill-extrusion-color",
      low ? NIGHT_PALETTE.uni.glowExtrusion : COLOR_UNI_DAY
    );
    setExtrusionAmbientOcclusion(map, LAYERS.uniBuildingGlow, low);
    trySetPaint(
      map,
      LAYERS.uniBuildingGlow,
      "fill-extrusion-emissive-strength",
      low ? NIGHT_GLOW_EMISSIVE : 0
    );
    trySetPaint(map, LAYERS.uniBuildingGlow, "fill-extrusion-flood-light-color", "#b3e5fc");
    trySetPaint(
      map,
      LAYERS.uniBuildingGlow,
      "fill-extrusion-flood-light-intensity",
      low ? NIGHT_GLOW_FLOOD_INTENSITY : 0
    );
    trySetPaint(
      map,
      LAYERS.uniBuildingGlow,
      "fill-extrusion-flood-light-wall-radius",
      low ? NIGHT_FLOOD_WALL_M + 4 : 0
    );
    trySetPaint(
      map,
      LAYERS.uniBuildingGlow,
      "fill-extrusion-flood-light-ground-radius",
      low ? NIGHT_FLOOD_GROUND_M + 6 : 0
    );
  }

  if (map.getLayer(LAYERS.kinderBuildingGlow)) {
    trySetPaint(
      map,
      LAYERS.kinderBuildingGlow,
      "fill-extrusion-color",
      low ? NIGHT_PALETTE.kinder.glowExtrusion : COLOR_KINDER_DAY
    );
    setExtrusionAmbientOcclusion(map, LAYERS.kinderBuildingGlow, low);
    trySetPaint(
      map,
      LAYERS.kinderBuildingGlow,
      "fill-extrusion-emissive-strength",
      low ? NIGHT_GLOW_EMISSIVE : 0
    );
    trySetPaint(map, LAYERS.kinderBuildingGlow, "fill-extrusion-flood-light-color", "#ffe0b2");
    trySetPaint(
      map,
      LAYERS.kinderBuildingGlow,
      "fill-extrusion-flood-light-intensity",
      low ? NIGHT_GLOW_FLOOD_INTENSITY : 0
    );
    trySetPaint(
      map,
      LAYERS.kinderBuildingGlow,
      "fill-extrusion-flood-light-wall-radius",
      low ? NIGHT_FLOOD_WALL_M + 4 : 0
    );
    trySetPaint(
      map,
      LAYERS.kinderBuildingGlow,
      "fill-extrusion-flood-light-ground-radius",
      low ? NIGHT_FLOOD_GROUND_M + 6 : 0
    );
  }

  const schoolPoi = low
    ? {
        "circle-color": NIGHT_PALETTE.school.fill,
        "circle-stroke-color": NIGHT_PALETTE.school.poiStroke,
        "circle-stroke-width": 3,
        "circle-blur": 0,
        "circle-opacity": EDUCATION_CIRCLE_OPACITY_FULL,
      }
    : {
        "circle-color": "#ffeb3b",
        "circle-stroke-color": "#f9a825",
        "circle-stroke-width": 2,
        "circle-blur": 0,
        "circle-opacity": EDUCATION_CIRCLE_OPACITY_FULL,
      };
  const uniPoi = low
    ? {
        "circle-color": NIGHT_PALETTE.uni.fill,
        "circle-stroke-color": NIGHT_PALETTE.uni.poiStroke,
        "circle-stroke-width": 3,
        "circle-blur": 0,
        "circle-opacity": EDUCATION_CIRCLE_OPACITY_FULL,
      }
    : {
        "circle-color": "#2196f3",
        "circle-stroke-color": "#1565c0",
        "circle-stroke-width": 2,
        "circle-blur": 0,
        "circle-opacity": EDUCATION_CIRCLE_OPACITY_FULL,
      };
  const kinderPoi = low
    ? {
        "circle-color": NIGHT_PALETTE.kinder.fill,
        "circle-stroke-color": NIGHT_PALETTE.kinder.poiStroke,
        "circle-stroke-width": 3,
        "circle-blur": 0,
        "circle-opacity": EDUCATION_CIRCLE_OPACITY_FULL,
      }
    : {
        "circle-color": "#ff9800",
        "circle-stroke-color": "#e65100",
        "circle-stroke-width": 2,
        "circle-blur": 0,
        "circle-opacity": EDUCATION_CIRCLE_OPACITY_FULL,
      };

  if (map.getLayer(LAYERS.schoolPoi)) {
    trySetPaint(map, LAYERS.schoolPoi, "circle-color", schoolPoi["circle-color"]);
    trySetPaint(map, LAYERS.schoolPoi, "circle-stroke-color", schoolPoi["circle-stroke-color"]);
    trySetPaint(map, LAYERS.schoolPoi, "circle-stroke-width", schoolPoi["circle-stroke-width"]);
    trySetPaint(map, LAYERS.schoolPoi, "circle-blur", schoolPoi["circle-blur"]);
    trySetPaint(map, LAYERS.schoolPoi, "circle-opacity", schoolPoi["circle-opacity"]);
  }
  if (map.getLayer(LAYERS.schoolPoiHalo)) {
    trySetPaint(
      map,
      LAYERS.schoolPoiHalo,
      "circle-color",
      NIGHT_PALETTE.school.poiHalo
    );
    trySetPaint(map, LAYERS.schoolPoiHalo, "circle-blur", 0.78);
  }
  if (map.getLayer(LAYERS.uniPoi)) {
    trySetPaint(map, LAYERS.uniPoi, "circle-color", uniPoi["circle-color"]);
    trySetPaint(map, LAYERS.uniPoi, "circle-stroke-color", uniPoi["circle-stroke-color"]);
    trySetPaint(map, LAYERS.uniPoi, "circle-stroke-width", uniPoi["circle-stroke-width"]);
    trySetPaint(map, LAYERS.uniPoi, "circle-blur", uniPoi["circle-blur"]);
    trySetPaint(map, LAYERS.uniPoi, "circle-opacity", uniPoi["circle-opacity"]);
  }
  if (map.getLayer(LAYERS.uniPoiHalo)) {
    trySetPaint(map, LAYERS.uniPoiHalo, "circle-color", NIGHT_PALETTE.uni.poiHalo);
    trySetPaint(map, LAYERS.uniPoiHalo, "circle-blur", 0.76);
  }
  if (map.getLayer(LAYERS.kinderPoi)) {
    trySetPaint(map, LAYERS.kinderPoi, "circle-color", kinderPoi["circle-color"]);
    trySetPaint(map, LAYERS.kinderPoi, "circle-stroke-color", kinderPoi["circle-stroke-color"]);
    trySetPaint(map, LAYERS.kinderPoi, "circle-stroke-width", kinderPoi["circle-stroke-width"]);
    trySetPaint(map, LAYERS.kinderPoi, "circle-blur", kinderPoi["circle-blur"]);
    trySetPaint(map, LAYERS.kinderPoi, "circle-opacity", kinderPoi["circle-opacity"]);
  }
  if (map.getLayer(LAYERS.kinderPoiHalo)) {
    trySetPaint(
      map,
      LAYERS.kinderPoiHalo,
      "circle-color",
      NIGHT_PALETTE.kinder.poiHalo
    );
    trySetPaint(map, LAYERS.kinderPoiHalo, "circle-blur", 0.72);
  }

  /** Night-only “bulb” POI circles — same filters as main POI; emissive reads as lamps on dark basemap */
  const applyPoiLampNight = (layerId, nightFill) => {
    if (!map.getLayer(layerId)) return;
    trySetPaint(map, layerId, "circle-radius", NIGHT_POI_LAMP_RADIUS);
    trySetPaint(map, layerId, "circle-blur", NIGHT_POI_LAMP_BLUR);
    if (low) {
      trySetPaint(map, layerId, "circle-color", nightFill);
      trySetPaint(map, layerId, "circle-opacity", EDUCATION_CIRCLE_OPACITY_FULL);
      trySetPaint(map, layerId, "circle-emissive-strength", NIGHT_POI_LAMP_EMISSIVE);
    } else {
      trySetPaint(map, layerId, "circle-opacity", 0);
      trySetPaint(map, layerId, "circle-emissive-strength", 0);
    }
  };
  applyPoiLampNight(LAYERS.schoolPoiLamp, NIGHT_PALETTE.school.fill);
  applyPoiLampNight(LAYERS.kinderPoiLamp, NIGHT_PALETTE.kinder.fill);
  applyPoiLampNight(LAYERS.uniPoiLamp, NIGHT_PALETTE.uni.fill);

  applyEducationPoiHoverStroke(map);
}

function symbolBeforeId(map) {
  const layers = map.getStyle()?.layers ?? [];
  return layers.find((l) => l.type === "symbol")?.id;
}

/**
 * Re-apply filters when filter logic changes (no need to remove/recreate layers).
 * @param {import('mapbox-gl').Map} map
 */
function refreshEducationLayerFilters(map) {
  /** @type {[string, unknown][]} */
  const pairs = [
    [LAYERS.schoolBuildingGlow, FILTER_SCHOOL_BUILDING],
    [LAYERS.schoolBuilding, FILTER_SCHOOL_BUILDING],
    [LAYERS.uniBuildingGlow, FILTER_UNI_BUILDING],
    [LAYERS.uniBuilding, FILTER_UNI_BUILDING],
    [LAYERS.kinderBuildingGlow, FILTER_KINDER_BUILDING],
    [LAYERS.kinderBuilding, FILTER_KINDER_BUILDING],
    [LAYERS.schoolPoiHalo, FILTER_SCHOOL_POI],
    [LAYERS.schoolPoi, FILTER_SCHOOL_POI],
    [LAYERS.uniPoiHalo, FILTER_UNI_POI],
    [LAYERS.uniPoi, FILTER_UNI_POI],
    [LAYERS.kinderPoiHalo, FILTER_KINDER_POI],
    [LAYERS.kinderPoi, FILTER_KINDER_POI],
    [LAYERS.schoolPoiLamp, FILTER_SCHOOL_POI],
    [LAYERS.kinderPoiLamp, FILTER_KINDER_POI],
    [LAYERS.uniPoiLamp, FILTER_UNI_POI],
  ];
  for (const [id, filter] of pairs) {
    if (!map.getLayer(id)) continue;
    try {
      map.setFilter(id, filter);
    } catch (e) {
      console.warn("Education layer filter", id, e);
    }
  }
}

export function ensureEducationLayers(map) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    });
  }

  const beforeId = symbolBeforeId(map);

  if (!map.getLayer(LAYERS.schoolBuildingGlow)) {
    map.addLayer(
      {
        id: LAYERS.schoolBuildingGlow,
        type: "fill-extrusion",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: FILTER_SCHOOL_BUILDING,
        minzoom: 13,
        layout: { visibility: "none" },
        paint: glowExtrusionPaintInitial(NIGHT_PALETTE.school.glowExtrusion),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.schoolBuildingGlow);
  }

  if (!map.getLayer(LAYERS.schoolBuilding)) {
    map.addLayer(
      {
        id: LAYERS.schoolBuilding,
        type: "fill-extrusion",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: FILTER_SCHOOL_BUILDING,
        minzoom: 13,
        layout: { visibility: "none" },
        paint: extrusionPaint(COLOR_SCHOOL_DAY),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.schoolBuilding);
  }

  if (!map.getLayer(LAYERS.uniBuildingGlow)) {
    map.addLayer(
      {
        id: LAYERS.uniBuildingGlow,
        type: "fill-extrusion",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: FILTER_UNI_BUILDING,
        minzoom: 13,
        layout: { visibility: "none" },
        paint: glowExtrusionPaintInitial(NIGHT_PALETTE.uni.glowExtrusion),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.uniBuildingGlow);
  }

  if (!map.getLayer(LAYERS.uniBuilding)) {
    map.addLayer(
      {
        id: LAYERS.uniBuilding,
        type: "fill-extrusion",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: FILTER_UNI_BUILDING,
        minzoom: 13,
        layout: { visibility: "none" },
        paint: extrusionPaint(COLOR_UNI_DAY),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.uniBuilding);
  }

  if (!map.getLayer(LAYERS.kinderBuildingGlow)) {
    map.addLayer(
      {
        id: LAYERS.kinderBuildingGlow,
        type: "fill-extrusion",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: FILTER_KINDER_BUILDING,
        minzoom: 13,
        layout: { visibility: "none" },
        paint: glowExtrusionPaintInitial(NIGHT_PALETTE.kinder.glowExtrusion),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.kinderBuildingGlow);
  }

  if (!map.getLayer(LAYERS.kinderBuilding)) {
    map.addLayer(
      {
        id: LAYERS.kinderBuilding,
        type: "fill-extrusion",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: FILTER_KINDER_BUILDING,
        minzoom: 13,
        layout: { visibility: "none" },
        paint: extrusionPaint(COLOR_KINDER_DAY),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.kinderBuilding);
  }

  const circlePaintSchool = {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      8,
      3,
      14,
      9,
      18,
      12,
    ],
    "circle-color": "#ffeb3b",
    "circle-opacity": 0.88,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#f9a825",
    "circle-blur": 0,
  };

  const circlePaintUni = {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      8,
      4,
      14,
      10,
      18,
      13,
    ],
    "circle-color": "#2196f3",
    "circle-opacity": 0.88,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#1565c0",
    "circle-blur": 0,
  };

  if (!map.getLayer(LAYERS.schoolPoiHalo)) {
    map.addLayer(
      {
        id: LAYERS.schoolPoiHalo,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_SCHOOL_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            6,
            14,
            14,
            18,
            18,
          ],
          "circle-color": NIGHT_PALETTE.school.poiHalo,
          "circle-opacity": 0,
          "circle-blur": 0.78,
        },
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.schoolPoi)) {
    map.addLayer(
      {
        id: LAYERS.schoolPoi,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_SCHOOL_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: circlePaintSchool,
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.uniPoiHalo)) {
    map.addLayer(
      {
        id: LAYERS.uniPoiHalo,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_UNI_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            6,
            14,
            14,
            18,
            18,
          ],
          "circle-color": NIGHT_PALETTE.uni.poiHalo,
          "circle-opacity": 0,
          "circle-blur": 0.76,
        },
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.uniPoi)) {
    map.addLayer(
      {
        id: LAYERS.uniPoi,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_UNI_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: circlePaintUni,
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.kinderPoiHalo)) {
    map.addLayer(
      {
        id: LAYERS.kinderPoiHalo,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_KINDER_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            8,
            14,
            16,
            18,
            20,
          ],
          "circle-color": NIGHT_PALETTE.kinder.poiHalo,
          "circle-opacity": 0,
          "circle-blur": 0.72,
        },
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.kinderPoi)) {
    map.addLayer(
      {
        id: LAYERS.kinderPoi,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_KINDER_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            5,
            14,
            11,
            18,
            14,
          ],
          "circle-color": "#ff9800",
          "circle-opacity": 0.88,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#e65100",
          "circle-blur": 0,
        },
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.schoolPoiLamp)) {
    map.addLayer(
      {
        id: LAYERS.schoolPoiLamp,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_SCHOOL_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": NIGHT_POI_LAMP_RADIUS,
          "circle-blur": NIGHT_POI_LAMP_BLUR,
          "circle-color": COLOR_SCHOOL_DAY,
          "circle-opacity": 0,
        },
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.kinderPoiLamp)) {
    map.addLayer(
      {
        id: LAYERS.kinderPoiLamp,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_KINDER_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": NIGHT_POI_LAMP_RADIUS,
          "circle-blur": NIGHT_POI_LAMP_BLUR,
          "circle-color": COLOR_KINDER_DAY,
          "circle-opacity": 0,
        },
      },
      beforeId
    );
  }

  if (!map.getLayer(LAYERS.uniPoiLamp)) {
    map.addLayer(
      {
        id: LAYERS.uniPoiLamp,
        type: "circle",
        source: SOURCE_ID,
        "source-layer": "poi_label",
        filter: FILTER_UNI_POI,
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": NIGHT_POI_LAMP_RADIUS,
          "circle-blur": NIGHT_POI_LAMP_BLUR,
          "circle-color": COLOR_UNI_DAY,
          "circle-opacity": 0,
        },
      },
      beforeId
    );
  }

  refreshEducationLayerFilters(map);
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {{ schools: boolean; kindergartens: boolean; universities: boolean }} v
 */
export function setEducationVisibility(map, v) {
  const vis = (on) => (on ? "visible" : "none");

  const { schools, kindergartens, universities } = v;

  if (map.getLayer(LAYERS.schoolBuildingGlow)) {
    map.setLayoutProperty(
      LAYERS.schoolBuildingGlow,
      "visibility",
      vis(schools)
    );
  }
  if (map.getLayer(LAYERS.schoolBuilding)) {
    map.setLayoutProperty(LAYERS.schoolBuilding, "visibility", vis(schools));
  }
  if (map.getLayer(LAYERS.schoolPoiHalo)) {
    map.setLayoutProperty(LAYERS.schoolPoiHalo, "visibility", vis(schools));
  }
  if (map.getLayer(LAYERS.schoolPoi)) {
    map.setLayoutProperty(LAYERS.schoolPoi, "visibility", vis(schools));
  }
  if (map.getLayer(LAYERS.schoolPoiLamp)) {
    map.setLayoutProperty(LAYERS.schoolPoiLamp, "visibility", vis(schools));
  }

  if (map.getLayer(LAYERS.kinderBuildingGlow)) {
    map.setLayoutProperty(
      LAYERS.kinderBuildingGlow,
      "visibility",
      vis(kindergartens)
    );
  }
  if (map.getLayer(LAYERS.kinderBuilding)) {
    map.setLayoutProperty(
      LAYERS.kinderBuilding,
      "visibility",
      vis(kindergartens)
    );
  }
  if (map.getLayer(LAYERS.kinderPoiHalo)) {
    map.setLayoutProperty(
      LAYERS.kinderPoiHalo,
      "visibility",
      vis(kindergartens)
    );
  }
  if (map.getLayer(LAYERS.kinderPoi)) {
    map.setLayoutProperty(LAYERS.kinderPoi, "visibility", vis(kindergartens));
  }
  if (map.getLayer(LAYERS.kinderPoiLamp)) {
    map.setLayoutProperty(LAYERS.kinderPoiLamp, "visibility", vis(kindergartens));
  }

  if (map.getLayer(LAYERS.uniBuildingGlow)) {
    map.setLayoutProperty(
      LAYERS.uniBuildingGlow,
      "visibility",
      vis(universities)
    );
  }
  if (map.getLayer(LAYERS.uniBuilding)) {
    map.setLayoutProperty(LAYERS.uniBuilding, "visibility", vis(universities));
  }
  if (map.getLayer(LAYERS.uniPoiHalo)) {
    map.setLayoutProperty(LAYERS.uniPoiHalo, "visibility", vis(universities));
  }
  if (map.getLayer(LAYERS.uniPoi)) {
    map.setLayoutProperty(LAYERS.uniPoi, "visibility", vis(universities));
  }
  if (map.getLayer(LAYERS.uniPoiLamp)) {
    map.setLayoutProperty(LAYERS.uniPoiLamp, "visibility", vis(universities));
  }
}

export function removeEducationLayers(map) {
  Object.values(LAYERS).forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

/** Full opacity for fill-extrusion highlight caps (matches extrusionPaint). */
export const EDUCATION_FILL_EXTRUSION_OPACITY_FULL = 0.92;

/** Full opacity for poi_label circle highlights. */
export const EDUCATION_CIRCLE_OPACITY_FULL = 0.88;

const EXTRUSION_LAYER_IDS = [
  LAYERS.schoolBuildingGlow,
  LAYERS.schoolBuilding,
  LAYERS.uniBuildingGlow,
  LAYERS.uniBuilding,
  LAYERS.kinderBuildingGlow,
  LAYERS.kinderBuilding,
];

const POI_LAYER_IDS = [
  LAYERS.schoolPoiHalo,
  LAYERS.schoolPoi,
  LAYERS.uniPoiHalo,
  LAYERS.uniPoi,
  LAYERS.kinderPoiHalo,
  LAYERS.kinderPoi,
  LAYERS.schoolPoiLamp,
  LAYERS.kinderPoiLamp,
  LAYERS.uniPoiLamp,
];

/**
 * Fade multiplier 0–1 for both extrusion and POI layers (avoids abrupt "pop-in").
 * @param {import('mapbox-gl').Map} map
 * @param {number} t 0..1
 */
export function setEducationHighlightFadeOpacity(map, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const eo = EDUCATION_FILL_EXTRUSION_OPACITY_FULL * clamped;
  const low =
    lastBasemapLightPreset === "dusk" || lastBasemapLightPreset === "night";
  const eGlow = (low ? EDUCATION_GLOW_OPACITY_FULL : 0) * clamped;
  const co = EDUCATION_CIRCLE_OPACITY_FULL * clamped;
  for (const id of EXTRUSION_LAYER_IDS) {
    if (!map.getLayer(id)) continue;
    const isGlow =
      id === LAYERS.schoolBuildingGlow ||
      id === LAYERS.uniBuildingGlow ||
      id === LAYERS.kinderBuildingGlow;
    map.setPaintProperty(
      id,
      "fill-extrusion-opacity",
      isGlow ? eGlow : eo
    );
  }
  for (const id of POI_LAYER_IDS) {
    if (!map.getLayer(id)) continue;
    if (id === LAYERS.schoolPoiHalo) {
      map.setPaintProperty(
        id,
        "circle-opacity",
        (low ? EDUCATION_SCHOOL_POI_HALO_OPACITY : 0) * clamped
      );
    } else if (id === LAYERS.uniPoiHalo) {
      map.setPaintProperty(
        id,
        "circle-opacity",
        (low ? EDUCATION_UNI_POI_HALO_OPACITY : 0) * clamped
      );
    } else if (id === LAYERS.kinderPoiHalo) {
      map.setPaintProperty(
        id,
        "circle-opacity",
        (low ? EDUCATION_KINDER_POI_HALO_OPACITY : 0) * clamped
      );
    } else if (
      id === LAYERS.schoolPoiLamp ||
      id === LAYERS.kinderPoiLamp ||
      id === LAYERS.uniPoiLamp
    ) {
      map.setPaintProperty(id, "circle-opacity", low ? co : 0);
    } else {
      map.setPaintProperty(id, "circle-opacity", co);
    }
  }
}
