/**
 * Education highlights — mapbox-streets-v8.
 * No landuse=school fill: it paints whole campuses and covers universities on shared grounds.
 * Uses building footprints: type=school vs type=university (Mapbox OSM-derived).
 */

export const SOURCE_ID = "streets-education-highlight";

const LAYERS = {
  schoolBuilding: "edu-highlight-bldg-school",
  uniBuilding: "edu-highlight-bldg-university",
  kinderBuilding: "edu-highlight-bldg-kinder",
  schoolPoi: "edu-highlight-school-poi",
  kinderPoi: "edu-highlight-kinder-poi",
  uniPoi: "edu-highlight-uni-poi",
};

/** Kindergarten POI: type / category_en */
const KINDERGARTEN_FILTER = [
  "any",
  ["==", ["get", "type"], "kindergarten"],
  ["==", ["get", "type"], "childcare"],
  [
    "in",
    ["get", "category_en"],
    [
      "literal",
      [
        "Kindergarten",
        "kindergarten",
        "Preschool",
        "preschool",
        "Nursery",
        "nursery",
      ],
    ],
  ],
];

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

  // K–12 / general school buildings (not landuse — avoids coloring uni campuses yellow)
  if (!map.getLayer(LAYERS.schoolBuilding)) {
    map.addLayer(
      {
        id: LAYERS.schoolBuilding,
        type: "fill",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: ["==", ["get", "type"], "school"],
        minzoom: 13,
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#ffeb3b",
          "fill-opacity": 0.42,
          "fill-outline-color": "#f9a825",
        },
      },
      beforeId
    );
  }

  // University buildings — blue footprint (separate from school landuse)
  if (!map.getLayer(LAYERS.uniBuilding)) {
    map.addLayer(
      {
        id: LAYERS.uniBuilding,
        type: "fill",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: ["==", ["get", "type"], "university"],
        minzoom: 13,
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#2196f3",
          "fill-opacity": 0.45,
          "fill-outline-color": "#1565c0",
        },
      },
      beforeId
    );
  }

  // Kindergarten: many OSM buildings use building=school; show orange footprint when only Kindergartens is on (see setEducationVisibility)
  if (!map.getLayer(LAYERS.kinderBuilding)) {
    map.addLayer(
      {
        id: LAYERS.kinderBuilding,
        type: "fill",
        source: SOURCE_ID,
        "source-layer": "building",
        filter: ["==", ["get", "type"], "school"],
        minzoom: 13,
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#ff9800",
          "fill-opacity": 0.48,
          "fill-outline-color": "#e65100",
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
        filter: [
          "all",
          ["==", ["get", "maki"], "school"],
          ["!", KINDERGARTEN_FILTER],
        ],
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            4,
            14,
            11,
            18,
            14,
          ],
          "circle-color": "#ffeb3b",
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fffde7",
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
        filter: ["all", ["==", ["get", "maki"], "school"], KINDERGARTEN_FILTER],
        minzoom: 8,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            7,
            14,
            14,
            18,
            18,
          ],
          "circle-color": "#ff9800",
          "circle-opacity": 0.9,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#fff3e0",
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
        filter: [
          "in",
          ["get", "maki"],
          ["literal", ["college", "university"]],
        ],
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
            14,
            18,
            18,
          ],
          "circle-color": "#2196f3",
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#e3f2fd",
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

  // School-type building fill: yellow when Schools on; orange when only Kindergartens (footprint for ბაღები without painting unis)
  if (map.getLayer(LAYERS.schoolBuilding)) {
    const showYellowSchoolBldg = schools;
    map.setLayoutProperty(
      LAYERS.schoolBuilding,
      "visibility",
      vis(showYellowSchoolBldg)
    );
  }
  if (map.getLayer(LAYERS.kinderBuilding)) {
    const showOrangeKinderBldg = kindergartens && !schools;
    map.setLayoutProperty(
      LAYERS.kinderBuilding,
      "visibility",
      vis(showOrangeKinderBldg)
    );
  }

  if (map.getLayer(LAYERS.uniBuilding)) {
    map.setLayoutProperty(LAYERS.uniBuilding, "visibility", vis(universities));
  }
  if (map.getLayer(LAYERS.schoolPoi)) {
    map.setLayoutProperty(LAYERS.schoolPoi, "visibility", vis(schools));
  }
  if (map.getLayer(LAYERS.kinderPoi)) {
    map.setLayoutProperty(LAYERS.kinderPoi, "visibility", vis(kindergartens));
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
