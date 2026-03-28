<script>
  import { onMount, createEventDispatcher } from "svelte";
  import GlobeCollapsible from "../GlobeCollapsible.svelte";
  import { getCollapsibleDataWithPDBs } from "../utils.js";

  const dispatch = createEventDispatcher();

  export let data = null; // Data from parent component
  export let selectedCountry = null; // Selected country from filter (may be unused for highlight)
  export let pdbData = null; // PDB data from CSV
  export let selectedCountryHighlight = null; // Country to highlight/center without filtering data
  export let legendItems = []; // Dynamic legend items for color scale
  export let maxPDBCount = 0; // Maximum PDB count for color scale

  let plotlyContainer;
  let chartInitialized = false;

  // Generate Plotly colorscale from legendItems
  function generateColorScale() {
    if (!legendItems || legendItems.length === 0 || maxPDBCount === 0) {
      // Fallback colorscale
      return [
        [0.0, "#F2F2EF"],
        [0.2, "#C4D2E3"],
        [0.4, "#929FA9"],
        [0.6, "#516575"],
        [0.8, "#253F53"],
        [1.0, "#162632"]
      ];
    }

    // Create normalized colorscale for Plotly
    const colorScale = [];
    legendItems.forEach((item, index) => {
      // Normalize the position based on the legend item's range
      let normalizedPosition = 0;
      if (item.max === 0) {
        normalizedPosition = 0;
      } else if (item.max === Infinity) {
        normalizedPosition = 1.0;
      } else {
        normalizedPosition = item.max / maxPDBCount;
      }
      
      // Ensure normalizedPosition is between 0 and 1
      normalizedPosition = Math.min(1.0, Math.max(0, normalizedPosition));
      
      colorScale.push([normalizedPosition, item.color]);
    });

    // Ensure we have 0.0 and 1.0 positions
    if (colorScale[0][0] !== 0.0) {
      colorScale.unshift([0.0, legendItems[0].color]);
    }
    if (colorScale[colorScale.length - 1][0] !== 1.0) {
      colorScale.push([1.0, legendItems[legendItems.length - 1].color]);
    }

    return colorScale;
  }

  // Default data - shared between initializeGlobe and updateGlobe
  const defaultCountries = [
    "Indonesia",
    "Malaysia",
    "Chile",
    "Bolivia",
    "Peru",
    "Argentina",
    "Cyprus",
    "India",
    "China",
    "Israel",
    "Palestine",
    "Lebanon",
    "Ethiopia",
    "South Sudan",
    "Somalia",
    "Kenya",
    "Pakistan",
    "Malawi",
    "Tanzania",
    "Syria",
    "France",
    "Suriname",
    "Guyana",
    "South Korea",
    "North Korea",
    "Morocco",
    "Costa Rica",
    "Nicaragua",
    "Republic of the Congo",
    "Democratic Republic of the Congo",
    "Bhutan",
    "Ukraine",
    "Belarus",
    "Namibia",
    "South Africa",
    "Saint Martin",
    "Sint Maarten",
    "Oman",
    "Uzbekistan",
    "Kazakhstan",
    "Tajikistan",
    "Lithuania",
    "Brazil",
    "Uruguay",
    "Mongolia",
    "Russia",
    "Czech Republic",
    "Germany",
    "Estonia",
    "Latvia",
    "Norway",
    "Sweden",
    "Finland",
    "Vietnam",
    "Cambodia",
    "Luxembourg",
    "United Arab Emirates",
    "Belgium",
    "Georgia",
    "Republic of Macedonia",
    "Albania",
    "Azerbaijan",
    "Kosovo",
    "Turkey",
    "Spain",
    "Laos",
    "Kyrgyzstan",
    "Armenia",
    "Denmark",
    "Libya",
    "Tunisia",
    "Romania",
    "Hungary",
    "Slovakia",
    "Poland",
    "Ireland",
    "United Kingdom",
    "Greece",
    "Zambia",
    "Sierra Leone",
    "Guinea",
    "Liberia",
    "Central African Republic",
    "Sudan",
    "Djibouti",
    "Eritrea",
    "Austria",
    "Iraq",
    "Italy",
    "Switzerland",
    "Iran",
    "Liechtenstein",
    "Ivory Coast",
    "Serbia",
    "Mali",
    "Senegal",
    "Nigeria",
    "Benin",
    "Angola",
    "Croatia",
    "Slovenia",
    "Qatar",
    "Saudi Arabia",
    "Botswana",
    "Zimbabwe",
    "Bulgaria",
    "Thailand",
    "San Marino",
    "Haiti",
    "Dominican Republic",
    "Chad",
    "Kuwait",
    "El Salvador",
    "Guatemala",
    "East Timor",
    "Brunei",
    "Monaco",
    "Algeria",
    "Mozambique",
    "Eswatini",
    "Burundi",
    "Rwanda",
    "Myanmar",
    "Bangladesh",
    "Andorra",
    "Afghanistan",
    "Montenegro",
    "Bosnia and Herzegovina",
    "Uganda",
    "Guantanamo Bay Naval Base",
    "Cuba",
    "Honduras",
    "Ecuador",
    "Colombia",
    "Paraguay",
    "Portugal",
    "Moldova",
    "Turkmenistan",
    "Jordan",
    "Nepal",
    "Lesotho",
    "Cameroon",
    "Gabon",
    "Niger",
    "Burkina Faso",
    "Togo",
    "Ghana",
    "Guinea-Bissau",
    "Gibraltar",
    "United States of America",
    "Canada",
    "Mexico",
    "Belize",
    "Panama",
    "Venezuela",
    "Papua New Guinea",
    "Egypt",
    "Yemen",
    "Mauritania",
    "Equatorial Guinea",
    "The Gambia",
    "Hong Kong",
    "Vatican City",
    "Australia",
    "Greenland",
    "Fiji",
    "New Caledonia",
    "Madagascar",
    "Philippines",
    "Sri Lanka",
    "Curaçao",
    "Aruba",
    "The Bahamas",
    "Turks and Caicos Islands",
    "Japan",
    "Saint Pierre and Miquelon",
    "Iceland",
    "Pitcairn Islands",
    "French Polynesia",
    "French Southern and Antarctic Lands",
    "Seychelles",
    "Kiribati",
    "Marshall Islands",
    "Trinidad and Tobago",
    "Grenada",
    "Saint Vincent and the Grenadines",
    "Barbados",
    "Saint Lucia",
    "Dominica",
    "Montserrat",
    "Antigua and Barbuda",
    "Saint Kitts and Nevis",
    "United States Virgin Islands",
    "Saint-Barthélemy",
    "Puerto Rico",
    "Anguilla",
    "British Virgin Islands",
    "Jamaica",
    "Cayman Islands",
    "Bermuda",
    "Heard Island and McDonald Islands",
    "Saint Helena",
    "Mauritius",
    "Comoros",
    "São Tomé and Príncipe",
    "Cape Verde",
    "Malta",
    "Jersey",
    "Guernsey",
    "Isle of Man",
    "Faroe Islands",
    "British Indian Ocean Territory",
    "Singapore",
    "Norfolk Island",
    "Cook Islands",
    "Tonga",
    "Wallis and Futuna",
    "Samoa",
    "Solomon Islands",
    "Tuvalu",
    "Maldives",
    "Nauru",
    "Federated States of Micronesia",
    "South Georgia and the South Sandwich Islands",
    "Falkland Islands",
    "Vanuatu",
    "Niue",
    "American Samoa",
    "Palau",
    "Guam",
    "Northern Mariana Islands",
    "Bahrain",
    "Clipperton Island",
    "Macau",
    "Bonaire",
    "Sint Eustatius",
    "Saba",
    "Netherlands",
    "Cocos Islands",
    "Christmas Islands",
    "Johnston Atoll",
    "Jarvis Island",
    "Baker Island",
    "Howland Island",
    "Wake Island",
    "Midway Island",
    "Navassa Island",
    "Palmyra Atoll",
    "Kingman Reef",
    "Tokelau",
    "New Zealand",
    "Aksai Chin",
    "Arunachal Pradesh",
    "Western Sahara",
    "Abyei",
    "Demchok",
    "United Nations Buffer Zone in Cyprus",
  ];

  const defaultCounts = [
    40, 60, 0, 0, 20, 0, 0, 90, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0,
    0, 0, 40, 0, 0, 0, 0, 0, 10, 0, 0, 30, 0, 0, 0, 20, 20, 0, 0, 50, 0, 10, 10,
    0, 150, 0, 0, 10, 20, 20, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 10, 0, 0, 0,
    10, 0, 10, 10, 0, 10, 0, 10, 10, 20, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 10, 0, 20, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 20, 0, 0, 10, 30, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 60, 40, 80, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 10, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ];

  // Store all countries and counts when no country is selected (for use when a country is selected)
  let allCountriesData = { countries: defaultCountries, counts: defaultCounts };

  // Computed collapsible data structure with PDB information
  // Always use getCollapsibleDataWithPDBs - it handles empty PDB data gracefully
  $: collapsibleData = getCollapsibleDataWithPDBs(
    data?.countries || defaultCountries,
    data?.counts || defaultCounts,
    pdbData || []
  );
  
  // Store all countries data when no country is selected
  $: if (data && data.countries && data.countries.length > 0 && (!selectedCountryHighlight || selectedCountryHighlight === "Country")) {
    allCountriesData = { countries: data.countries, counts: data.counts };
  }

  const countryCoordinates = {
    Afghanistan: [33.0, 65.0],
    Albania: [41.0, 20.0],
    Algeria: [28.0, 3.0],
    Andorra: [42.5, 1.6],
    Angola: [-12.5, 18.5],
    Argentina: [-34.0, -64.0],
    Armenia: [40.0, 45.0],
    Australia: [-27.0, 133.0],
    Austria: [47.3333, 13.3333],
    Azerbaijan: [40.5, 47.5],
    Bahrain: [26.0, 50.55],
    Bangladesh: [24.0, 90.0],
    Belarus: [53.0, 28.0],
    Belgium: [50.8333, 4.0],
    Belize: [17.25, -88.75],
    Benin: [9.5, 2.25],
    Bhutan: [27.5, 90.5],
    Bolivia: [-17.0, -65.0],
    "Bosnia and Herzegovina": [44.0, 18.0],
    Botswana: [-22.0, 24.0],
    Brazil: [-10.0, -55.0],
    Brunei: [4.5, 114.6667],
    Bulgaria: [43.0, 25.0],
    "Burkina Faso": [13.0, -2.0],
    Burundi: [-3.5, 30.0],
    Cambodia: [13.0, 105.0],
    Cameroon: [6.0, 12.0],
    Canada: [60.0, -95.0],
    "Cape Verde": [16.0, -24.0],
    "Central African Republic": [7.0, 21.0],
    Chad: [15.0, 19.0],
    Chile: [-30.0, -71.0],
    China: [35.0, 105.0],
    Colombia: [4.0, -72.0],
    Comoros: [-12.1667, 44.25],
    "Republic of the Congo": [-1.0, 15.0],
    "Democratic Republic of the Congo": [0.0, 25.0],
    "Costa Rica": [10.0, -84.0],
    "Ivory Coast": [8.0, -5.0],
    Croatia: [45.1667, 15.5],
    Cuba: [21.5, -80.0],
    Cyprus: [35.0, 33.0],
    "Czech Republic": [49.75, 15.5],
    Denmark: [56.0, 10.0],
    Djibouti: [11.5, 43.0],
    "Dominican Republic": [19.0, -70.6667],
    Ecuador: [-2.0, -77.5],
    Egypt: [27.0, 30.0],
    "El Salvador": [13.8333, -88.9167],
    "Equatorial Guinea": [2.0, 10.0],
    Eritrea: [15.0, 39.0],
    Estonia: [59.0, 26.0],
    Ethiopia: [8.0, 38.0],
    Fiji: [-18.0, 175.0],
    Finland: [64.0, 26.0],
    France: [46.0, 2.0],
    Gabon: [-1.0, 11.75],
    "The Gambia": [13.4667, -16.5667],
    Georgia: [42.0, 43.5],
    Germany: [51.0, 9.0],
    Ghana: [8.0, -2.0],
    Gibraltar: [36.1833, -5.3667],
    Greece: [39.0, 22.0],
    Greenland: [72.0, -40.0],
    Guatemala: [15.5, -90.25],
    Guinea: [11.0, -10.0],
    "Guinea-Bissau": [12.0, -15.0],
    Guyana: [5.0, -59.0],
    Haiti: [19.0, -72.4167],
    Honduras: [15.0, -86.5],
    "Hong Kong": [22.25, 114.1667],
    Hungary: [47.0, 20.0],
    Iceland: [65.0, -18.0],
    India: [20.0, 77.0],
    Indonesia: [-5.0, 120.0],
    Iran: [32.0, 53.0],
    Iraq: [33.0, 44.0],
    Ireland: [53.0, -8.0],
    Israel: [31.5, 34.75],
    Italy: [42.8333, 12.8333],
    Jamaica: [18.25, -77.5],
    Japan: [36.0, 138.0],
    Jordan: [31.0, 36.0],
    Kazakhstan: [48.0, 68.0],
    Kenya: [1.0, 38.0],
    "North Korea": [40.0, 127.0],
    "South Korea": [37.0, 127.5],
    Korea: [37.0, 127.5], // Alias for South Korea
    Kosovo: [42.5, 21.0],
    Kuwait: [29.3375, 47.6581],
    Kyrgyzstan: [41.0, 75.0],
    Laos: [18.0, 105.0],
    Latvia: [57.0, 25.0],
    Lebanon: [33.8333, 35.8333],
    Lesotho: [-29.5, 28.5],
    Liberia: [6.5, -9.5],
    Libya: [25.0, 17.0],
    Liechtenstein: [47.1667, 9.5333],
    Lithuania: [56.0, 24.0],
    Luxembourg: [49.75, 6.1667],
    Macau: [22.1667, 113.55],
    "Republic of Macedonia": [41.8333, 22.0],
    Madagascar: [-20.0, 47.0],
    Malawi: [-13.5, 34.0],
    Malaysia: [2.5, 112.5],
    Maldives: [3.25, 73.0],
    Mali: [17.0, -4.0],
    Malta: [35.8333, 14.5833],
    Mauritania: [20.0, -12.0],
    Mauritius: [-20.2833, 57.55],
    Mexico: [23.0, -102.0],
    "Federated States of Micronesia": [6.9167, 158.25],
    Moldova: [47.0, 29.0],
    Monaco: [43.7333, 7.4],
    Mongolia: [46.0, 105.0],
    Montenegro: [42.0, 19.0],
    Morocco: [32.0, -5.0],
    Mozambique: [-18.25, 35.0],
    Myanmar: [22.0, 98.0],
    Namibia: [-22.0, 17.0],
    Nepal: [28.0, 84.0],
    Netherlands: [52.5, 5.75],
    "New Zealand": [-41.0, 174.0],
    Nicaragua: [13.0, -85.0],
    Niger: [16.0, 8.0],
    Nigeria: [10.0, 8.0],
    Norway: [62.0, 10.0],
    Oman: [21.0, 57.0],
    Pakistan: [30.0, 70.0],
    Palau: [7.5, 134.5],
    Palestine: [32.0, 35.25],
    Panama: [9.0, -80.0],
    "Papua New Guinea": [-6.0, 147.0],
    Paraguay: [-23.0, -58.0],
    Peru: [-10.0, -76.0],
    Philippines: [13.0, 122.0],
    Poland: [52.0, 20.0],
    Portugal: [39.5, -8.0],
    Qatar: [25.5, 51.25],
    Romania: [46.0, 25.0],
    Russia: [60.0, 100.0],
    "Russian Federation": [60.0, 100.0], // Alias for Russia
    Rwanda: [-2.0, 30.0],
    "San Marino": [43.7667, 12.4167],
    "Saudi Arabia": [25.0, 45.0],
    Senegal: [14.0, -14.0],
    Serbia: [44.0, 21.0],
    Seychelles: [-4.5833, 55.6667],
    "Sierra Leone": [8.5, -11.5],
    Singapore: [1.3667, 103.8],
    Slovakia: [48.6667, 19.5],
    Slovenia: [46.0, 15.0],
    "Solomon Islands": [-8.0, 159.0],
    Somalia: [10.0, 49.0],
    "South Africa": [-29.0, 24.0],
    "South Sudan": [8.0, 30.0],
    Spain: [40.0, -4.0],
    "Sri Lanka": [7.0, 81.0],
    Sudan: [15.0, 30.0],
    Suriname: [4.0, -56.0],
    Eswatini: [-26.5, 31.5],
    Sweden: [62.0, 15.0],
    Switzerland: [47.0, 8.0],
    Syria: [35.0, 38.0],
    Tajikistan: [39.0, 71.0],
    Tanzania: [-6.0, 35.0],
    Thailand: [15.0, 100.0],
    "East Timor": [-8.55, 125.5167],
    Togo: [8.0, 1.1667],
    Tonga: [-20.0, -175.0],
    "Trinidad and Tobago": [11.0, -61.0],
    Tunisia: [34.0, 9.0],
    Turkey: [39.0, 35.0],
    Türkiye: [39.0, 35.0], // Alias for Turkey
    Turkmenistan: [40.0, 60.0],
    Uganda: [1.0, 32.0],
    Ukraine: [49.0, 32.0],
    "United Arab Emirates": [24.0, 54.0],
    "United Kingdom": [54.0, -2.0],
    "United States of America": [38.0, -97.0],
    "United States": [38.0, -97.0], // Alias for United States of America
    USA: [38.0, -97.0], // Alias for United States of America
    Uruguay: [-33.0, -56.0],
    Uzbekistan: [41.0, 64.0],
    Vanuatu: [-16.0, 167.0],
    "Vatican City": [41.9, 12.45],
    Venezuela: [8.0, -66.0],
    Vietnam: [16.0, 106.0],
    Yemen: [15.0, 48.0],
    Zambia: [-15.0, 30.0],
    Zimbabwe: [-20.0, 30.0],
  };

  // Layout configuration - shared between initializeGlobe and updateGlobe
  const layout = {
    autosize: true,
    geo: {
      bgcolor: "#3B5264",
      landcolor: "lightgray",
      showland: true,
      showlakes: true,
      lakecolor: "white",
      projection: {
        type: "orthographic",
      },
      showocean: true,
      oceancolor: "white",
      showcountries: true,
      countrycolor: "#F2F2EF",
      subunitcolor: "#F2F2EF",
    },
    margin: {
      b: 0,
      l: 0,
      r: 0,
      t: 0,
    },
    template: {
      data: {
        bar: [
          {
            error_x: {
              color: "#2a3f5f",
            },
            error_y: {
              color: "#2a3f5f",
            },
            marker: {
              line: {
                color: "#2a3f5f",
              },
            },
          },
        ],
        table: [
          {
            header: {
              fill: {
                color: "#C8D4E3",
              },
              line: {
                color: "white",
              },
            },
            cells: {
              fill: {
                color: "#EBF0F8",
              },
              line: {
                color: "white",
              },
            },
          },
        ],
      },
      layout: {
        annotationdefaults: {
          arrowcolor: "#2a3f5f",
          arrowhead: 0,
          arrowwidth: 1,
        },
        autocolorscale: true,
        colorway: [
          "#636efa",
          "#EF553B",
          "#00CC96",
          "#AB63FA",
          "#FFA15A",
          "#19d3f3",
          "#FF6692",
          "#B6E880",
          "#FF97FF",
          "#FECB52",
        ],
        font: {
          color: "#2a3f5f",
        },
        hoverlabel: {
          bgcolor: "#F4F5F9",
          bordercolor: "#2a3f5f",
          font: {
            color: "#2a3f5f",
          },
        },
        hovermode: "closest",
        mapbox: {
          style: "light",
        },
        paper_bgcolor: "#3B5264",
        plot_bgcolor: "#3B5264",
        shapedefaults: {
          line: {
            color: "white",
          },
        },
        title: {
          x: 0.05,
        },
        xaxis: {
          gridcolor: "white",
          linecolor: "white",
          ticks: "",
          title: {
            standoff: 15,
          },
          zerolinecolor: "white",
          zerolinewidth: 2,
        },
        yaxis: {
          gridcolor: "white",
          linecolor: "white",
          ticks: "",
          title: {
            standoff: 15,
          },
          zerolinecolor: "white",
          zerolinewidth: 2,
        },
      },
    },
  };

  // Reactive statement to update globe when data changes
  $: if (chartInitialized && data) {
    updateGlobe();
  }

  // Also update globe when only the highlight selection changes (no data change)
  $: if (chartInitialized && selectedCountryHighlight !== undefined) {
    updateGlobe();
  }

  // Reactive statement to center globe when country is selected
  $: if (chartInitialized && selectedCountryHighlight && selectedCountryHighlight !== "Country" && countryCoordinates[selectedCountryHighlight]) {
    console.log("🌍 Centering globe on country:", selectedCountryHighlight);
    centerOnCountry(selectedCountryHighlight);
  }

  onMount(async () => {
    // Load Plotly dynamically
    const script = document.createElement("script");
    script.src = "https://cdn.plot.ly/plotly-2.35.2.min.js";
    script.onload = () => {
      // Double-check container is available before initializing
      setTimeout(() => {
        if (plotlyContainer) {
          initializeGlobe();
          chartInitialized = true;
        }
      }, 0);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  });

  // Export resetView function so parent can call it
  export function resetView() {
    if (typeof window.Plotly === "undefined" || !plotlyContainer) return;

    // Reset to initial view
    const update = {
      "geo.projection.rotation.lon": 0,
      "geo.projection.rotation.lat": 0,
      "geo.projection.rotation.roll": 0,
    };

    window.Plotly.relayout(plotlyContainer, update);
  }

  // Center the globe on a specific country
  function centerOnCountry(country) {
    if (typeof window.Plotly === "undefined" || !plotlyContainer) return;
    if (!countryCoordinates[country]) return;

    const [lat, lon] = countryCoordinates[country];

    // For orthographic projection, we need to rotate the globe
    // The rotation longitude should be negative of the country's longitude
    // The rotation latitude should be negative of the country's latitude
    const update = {
      "geo.projection.rotation.lon": lon,
      "geo.projection.rotation.lat": lat,
      "geo.projection.rotation.roll": 0,
    };

    window.Plotly.relayout(plotlyContainer, update);
  }

  function updateGlobe() {
    if (typeof window.Plotly === "undefined") return;

    // Determine if a country is selected
    const isCountrySelected = selectedCountryHighlight && selectedCountryHighlight !== "Country";
    const selectedCountryName = isCountrySelected ? selectedCountryHighlight : null;

    let countries, counts;
    let realCounts;

    if (isCountrySelected) {
      // When a country is selected: show all countries but dim the others
      // Use stored allCountriesData (from when no country was selected)
      const allCountries = allCountriesData.countries;
      
      // Create a map of country to count from filtered data (selected country's data)
      const countryCountMap = {};
      if (data && data.countries && data.counts) {
        data.countries.forEach((country, index) => {
          countryCountMap[country] = data.counts[index];
        });
      }
      
      // Get real counts for hover display (use actual counts, not modified for color)
      realCounts = allCountries.map((country, index) => {
        return countryCountMap[country] !== undefined ? countryCountMap[country] : allCountriesData.counts[index];
      });

      // Find maximum count to ensure selected country gets dark color (#0F1921)
      const maxCount = Math.max(...realCounts, 1);
      
      // Set counts for color visualization: selected country gets maxCount for dark color
      counts = allCountries.map((country, index) => {
        if (country === selectedCountryName) {
          return maxCount; // Set to maximum to get dark color (#0F1921)
        }
        return countryCountMap[country] !== undefined ? countryCountMap[country] : allCountriesData.counts[index];
      });

      countries = allCountries;

    } else {
      // When no country is selected: use data as before (normal state)
      if (data && data.countries !== undefined) {
        countries = data.countries;
        counts = data.counts;
      } else {
        countries = defaultCountries;
        counts = defaultCounts;
      }
      realCounts = counts;
    }

    // Determine hover counts: use real counts when country is selected, otherwise use counts
    const hoverCounts = realCounts;

    // Prepare data for Plotly, ensuring Taiwan is treated as part of China
    let displayCountries = [...countries];
    let displayCounts = [...counts];
    let displayHoverCounts = [...hoverCounts];
    let displayHoverText = [...countries];

    const chinaIndex = displayCountries.indexOf("China");
    if (chinaIndex !== -1) {
      const chinaCount = displayCounts[chinaIndex];
      const chinaHoverCount = displayHoverCounts[chinaIndex];
      
      // Check if Taiwan is already in the list
      const taiwanIndex = displayCountries.indexOf("Taiwan");
      
      if (taiwanIndex === -1) {
        displayCountries.push("Taiwan");
        displayCounts.push(chinaCount);
        displayHoverCounts.push(chinaHoverCount);
        displayHoverText.push("China");
      } else {
        displayCounts[taiwanIndex] = chinaCount;
        displayHoverCounts[taiwanIndex] = chinaHoverCount;
        displayHoverText[taiwanIndex] = "China";
      }
    }

    const plotlyData = [
      {
        geo: "geo",
        hovertemplate: "<b>%{hovertext}</b><br>%{customdata} PDBs<extra></extra>",
        hovertext: displayHoverText,
        customdata: displayHoverCounts,
        locationmode: "country names",
        locations: displayCountries,
        marker: {
          line: {
            color: "#444",
            width: 0,
          },
        },
        name: "Value",
        showscale: false,
        type: "choropleth",
        colorscale: generateColorScale(),
        zmin: 0,
        zmax: maxPDBCount || 1,
        z: displayCounts,
      },
    ];

    // Update the existing plot
    window.Plotly.react(plotlyContainer, plotlyData, layout, {
      displayModeBar: false,
      staticPlot: false,
      responsive: true,
      scrollZoom: false,
      doubleClick: false,
      showTips: false,
      showLink: false,
      sendData: false,
    });

    // Re-attach click event listener after update
    plotlyContainer.on('plotly_click', function(eventData) {
      if (eventData.points && eventData.points.length > 0) {
        let clickedCountry = eventData.points[0].location;
        if (clickedCountry === "Taiwan") clickedCountry = "China";
        console.log('🖱️ Country clicked on globe:', clickedCountry);
        dispatch('countryClick', { country: clickedCountry });
      }
    });
  }

  function initializeGlobe() {
    if (typeof window.Plotly === "undefined") return;

    // Prepare data for Plotly, ensuring Taiwan is treated as part of China
    let displayCountries = [...defaultCountries];
    let displayCounts = [...defaultCounts];
    let displayHoverText = [...defaultCountries];

    const chinaIndex = displayCountries.indexOf("China");
    if (chinaIndex !== -1) {
      const chinaCount = displayCounts[chinaIndex];
      
      const taiwanIndex = displayCountries.indexOf("Taiwan");
      if (taiwanIndex === -1) {
        displayCountries.push("Taiwan");
        displayCounts.push(chinaCount);
        displayHoverText.push("China");
      } else {
        displayCounts[taiwanIndex] = chinaCount;
        displayHoverText[taiwanIndex] = "China";
      }
    }

    const plotlyData = [
      {
        geo: "geo",
        hovertemplate: "<b>%{hovertext}</b><br>%{z} PDBs<extra></extra>",
        hovertext: displayHoverText,
        locationmode: "country names",
        locations: displayCountries,
        marker: {
          line: {
            color: "#444",
            width: 0,
          },
        },
        name: "Value",
        showscale: false,
        type: "choropleth",
        colorscale: generateColorScale(),
        zmin: 0,
        zmax: maxPDBCount || 1,
        z: displayCounts,
      },
    ];

    window.Plotly.newPlot(plotlyContainer, plotlyData, layout, {
      displayModeBar: false,
      staticPlot: false,
      responsive: true,
      scrollZoom: false,
      doubleClick: false,
      showTips: false,
      showLink: false,
      sendData: false,
    });

    // Add click event listener
    plotlyContainer.on('plotly_click', function(eventData) {
      if (eventData.points && eventData.points.length > 0) {
        let clickedCountry = eventData.points[0].location;
        if (clickedCountry === "Taiwan") clickedCountry = "China";
        console.log('🖱️ Country clicked on globe:', clickedCountry);
        dispatch('countryClick', { country: clickedCountry });
      }
    });
  }
</script>

<div class="relative w-full flex flex-col md:flex-row justify-center items-center bg-[#3B5264] gap-4 py-5 sm:py-8 px-4 sm:px-6">
  <!-- Globe Container -->
  <div
    bind:this={plotlyContainer}
    class="w-full max-w-[300px] h-[300px] sm:max-w-[420px] sm:h-[420px] md:max-w-[620px] md:h-[620px] bg-transparent"
  ></div>

  <!-- Collapsible Component - Positioned Absolutely -->
  <div class="w-full md:w-[325px] md:h-full md:static md:block">
    <GlobeCollapsible 
      data={collapsibleData} 
      selectedCountry={selectedCountryHighlight}
      legendItems={legendItems}
      on:countryClick={(event) => dispatch('countryClick', event.detail)}
    />
  </div>
</div>

<style>
  .globe-chart :global(.plotly .modebar) {
    display: none !important;
  }
</style>
