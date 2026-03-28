/**
 * Education highlights — Mapbox Standard + mapbox-streets-v8.
 * მხოლოდ `building` fill-extrusion (poi წრეები აღარ გამოიყენება).
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
};

/** building: ბაღი / საბავშვო */
const FILTER_KINDER_BUILDING = [
  "any",
  ["==", ["get", "class"], "kindergarten"],
  ["==", ["get", "type"], "kindergarten"],
  ["==", ["get", "class"], "preschool"],
];

/**
 * სკოლა: school / education კლასები, მაგრამ არა უნივერსიტეტი/კოლეჯი
 * (class=education ხშირად ერთდება უნივერსიტეტს — უნდა გამოვრიცხოთ type-ით).
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

/** უნივერსიტეტი — მხოლოდ type=university */
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

  if (map.getLayer(LAYERS.kinderBuilding)) {
    map.setLayoutProperty(
      LAYERS.kinderBuilding,
      "visibility",
      vis(kindergartens)
    );
  }

  if (map.getLayer(LAYERS.uniBuilding)) {
    map.setLayoutProperty(LAYERS.uniBuilding, "visibility", vis(universities));
  }
}

export function removeEducationLayers(map) {
  Object.values(LAYERS).forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}
