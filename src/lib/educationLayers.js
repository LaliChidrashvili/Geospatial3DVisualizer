/**
 * Education highlights — Mapbox Standard + mapbox-streets-v8.
 * Hybrid: building fill-extrusion + poi_label circles (school / kindergarten / university)
 * where footprints or 3D extrusion are missing.
 */

export const SOURCE_ID = "streets-education-highlight";

/** Default building height (m) when the tile has no height property */
export const DEFAULT_BUILDING_HEIGHT_M = 15;

/** Extra meters above roof for highlighted education buildings */
const HIGHLIGHT_ROOF_CAP_M = 6;

const LAYERS = {
  schoolBuilding: "edu-highlight-bldg-school",
  uniBuilding: "edu-highlight-bldg-university",
  kinderBuilding: "edu-highlight-bldg-kinder",
  schoolPoi: "edu-highlight-poi-school",
  uniPoi: "edu-highlight-poi-uni",
  kinderPoi: "edu-highlight-poi-kinder",
};

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

/** poi_label: K–12 / general school POIs, excluding kindergarten-style POIs */
const FILTER_SCHOOL_POI = [
  "all",
  [
    "any",
    ["==", ["get", "type"], "school"],
    ["==", ["get", "class"], "school"],
    ["==", ["get", "class"], "education"],
    ["==", ["get", "maki"], "school"],
  ],
  ["!", FILTER_KINDER_POI],
];

/** poi_label: universities / colleges when no building match */
const FILTER_UNI_POI = [
  "any",
  ["==", ["get", "type"], "university"],
  ["==", ["get", "class"], "university"],
  ["==", ["get", "type"], "college"],
  ["in", ["get", "maki"], ["literal", ["college", "university"]]],
];

/**
 * Schools: type/class school or class education, but exclude university/college
 * (class=education often tags universities — exclude by type).
 */
const FILTER_SCHOOL_BUILDING = [
  "all",
  [
    "any",
    ["==", ["get", "type"], "school"],
    ["==", ["get", "class"], "school"],
    ["==", ["get", "class"], "education"],
  ],
  ["!", ["in", ["get", "type"], ["literal", ["university", "college"]]]],
];

/** Universities: type=university only */
const FILTER_UNI_BUILDING = ["==", ["get", "type"], "university"];

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
  };
}

function symbolBeforeId(map) {
  const layers = map.getStyle()?.layers ?? [];
  return layers.find((l) => l.type === "symbol")?.id;
}

export function ensureEducationLayers(map) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    });
  }

  const beforeId = symbolBeforeId(map);

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
        paint: extrusionPaint("#ffeb3b"),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.schoolBuilding);
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
        paint: extrusionPaint("#2196f3"),
      },
      beforeId
    );
    applyExtrusionHeightFromData(map, LAYERS.uniBuilding);
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
        paint: extrusionPaint("#ff9800"),
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
  };

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
        },
      },
      beforeId
    );
  }
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {{ schools: boolean; kindergartens: boolean; universities: boolean }} v
 */
export function setEducationVisibility(map, v) {
  const vis = (on) => (on ? "visible" : "none");

  const { schools, kindergartens, universities } = v;

  if (map.getLayer(LAYERS.schoolBuilding)) {
    map.setLayoutProperty(LAYERS.schoolBuilding, "visibility", vis(schools));
  }
  if (map.getLayer(LAYERS.schoolPoi)) {
    map.setLayoutProperty(LAYERS.schoolPoi, "visibility", vis(schools));
  }

  if (map.getLayer(LAYERS.kinderBuilding)) {
    map.setLayoutProperty(
      LAYERS.kinderBuilding,
      "visibility",
      vis(kindergartens)
    );
  }
  if (map.getLayer(LAYERS.kinderPoi)) {
    map.setLayoutProperty(LAYERS.kinderPoi, "visibility", vis(kindergartens));
  }

  if (map.getLayer(LAYERS.uniBuilding)) {
    map.setLayoutProperty(LAYERS.uniBuilding, "visibility", vis(universities));
  }
  if (map.getLayer(LAYERS.uniPoi)) {
    map.setLayoutProperty(LAYERS.uniPoi, "visibility", vis(universities));
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
  LAYERS.schoolBuilding,
  LAYERS.uniBuilding,
  LAYERS.kinderBuilding,
];

const POI_LAYER_IDS = [LAYERS.schoolPoi, LAYERS.uniPoi, LAYERS.kinderPoi];

/**
 * Fade multiplier 0–1 for both extrusion and POI layers (avoids abrupt "pop-in").
 * @param {import('mapbox-gl').Map} map
 * @param {number} t 0..1
 */
export function setEducationHighlightFadeOpacity(map, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const eo = EDUCATION_FILL_EXTRUSION_OPACITY_FULL * clamped;
  const co = EDUCATION_CIRCLE_OPACITY_FULL * clamped;
  for (const id of EXTRUSION_LAYER_IDS) {
    if (map.getLayer(id)) {
      map.setPaintProperty(id, "fill-extrusion-opacity", eo);
    }
  }
  for (const id of POI_LAYER_IDS) {
    if (map.getLayer(id)) {
      map.setPaintProperty(id, "circle-opacity", co);
    }
  }
}
