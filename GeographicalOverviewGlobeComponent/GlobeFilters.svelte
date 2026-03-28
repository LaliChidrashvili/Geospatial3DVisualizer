<script>
  import CustomDropdown from "$lib/CustomDropdown.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  
  export let data = null; // Data from parent component
  export let isMobile = false; // Mobile state

  // Declare variables
  let countryOptions = [];
  let sizeOptions = [];
  let foundationYearOptions = [];

  // Filter options - use real data if available, otherwise use default
  $: {
    countryOptions = data && data.countries ? ["Country", ...data.countries] : [
      "Country",
      "France",
      "Germany",
      "United Kingdom",
      "Spain",
      "Italy",
      "Brazil",
      "Argentina",
      "Peru",
      "Chile",
      "Colombia",
      "United States",
      "Canada",
      "Mexico",
      "Japan",
      "South Korea",
      "China",
      "India",
      "Indonesia",
      "Malaysia",
      "Thailand",
    ];
  }

  $: sizeOptions = data && data.sizes ? ["Size", ...data.sizes] : [
    "Size",
    "Small (1-10)",
    "Medium (11-50)",
    "Large (51-100)",
    "Extra Large (100+)",
  ];

  $: foundationYearOptions = data && data.foundationYears ? ["Foundation Year", ...data.foundationYears] : [
    "Foundation Year",
    "Before 1950",
    "1950-1970",
    "1970-1990",
    "1990-2010",
    "After 2010",
  ];

  // Use dynamic nPerCountry options from data
  $: nPerCountryOptions = data && data.nPerCountryOptions 
    ? ["N. per country", ...data.nPerCountryOptions.map(r => r.label)]
    : [
        "N. per country",
        "0",
        "1-20",
        "21-40",
        "41-60",
        "61-80",
        "81-100",
        ">100"
      ];

  // Selected values
  let selectedCountry = "Country";
  let selectedSize = "Size";
  let selectedFoundationYear = "Foundation Year";
  let selectedNPerCountry = "N. per country";

  // Dropdown states
  let countryOpen = false;
  let sizeOpen = false;
  let foundationYearOpen = false;
  let nPerCountryOpen = false;

  // Mobile filters state
  let showFilters = false;

  // Calculate how many filters are selected (not default)
  $: activeFiltersCount = [
    selectedCountry !== "Country",
    selectedSize !== "Size",
    selectedFoundationYear !== "Foundation Year",
    selectedNPerCountry !== "N. per country"
  ].filter(Boolean).length;

  function toggleShowFilters() {
    showFilters = !showFilters;
  }

  // Filter functions
  function handleCountrySelect(option) {
    selectedCountry = option;
    countryOpen = false;
    dispatchFiltersChanged();
  }

  function handleSizeSelect(option) {
    selectedSize = option;
    sizeOpen = false;
    dispatchFiltersChanged();
  }

  function handleFoundationYearSelect(option) {
    selectedFoundationYear = option;
    foundationYearOpen = false;
    dispatchFiltersChanged();
  }

  function handleNPerCountrySelect(option) {
    selectedNPerCountry = option;
    nPerCountryOpen = false;
    dispatchFiltersChanged();
  }

  function dispatchFiltersChanged() {
    if (isMobile) {
      showFilters = false;
    }
    dispatch("filtersChanged", {
      country: selectedCountry,
      size: selectedSize,
      foundationYear: selectedFoundationYear,
      nPerCountry: selectedNPerCountry,
    });
  }

  function resetFilters() {
    selectedCountry = "Country";
    selectedSize = "Size";
    selectedFoundationYear = "Foundation Year";
    selectedNPerCountry = "N. per country";
    dispatch("resetFilters");
    dispatchFiltersChanged();
  }

  // Export function to programmatically set country
  export function setCountry(country) {
    // Check if country exists in options
    if (countryOptions.includes(country)) {
      console.log('🎯 Setting country filter to:', country);
      selectedCountry = country;
      dispatchFiltersChanged();
    } else {
      console.log('⚠️ Country not found in filter options:', country);
    }
  }

  function toggleCountry() {
    countryOpen = !countryOpen;
    sizeOpen = false;
    foundationYearOpen = false;
    nPerCountryOpen = false;
  }

  function toggleSize() {
    sizeOpen = !sizeOpen;
    countryOpen = false;
    foundationYearOpen = false;
    nPerCountryOpen = false;
  }

  function toggleFoundationYear() {
    foundationYearOpen = !foundationYearOpen;
    countryOpen = false;
    sizeOpen = false;
    nPerCountryOpen = false;
  }

  function toggleNPerCountry() {
    nPerCountryOpen = !nPerCountryOpen;
    countryOpen = false;
    sizeOpen = false;
    foundationYearOpen = false;
  }

  // Calculate filtered counts for tooltips
  $: filteredCountryCount = data && data.countries ? data.countries.length : 0;
  $: filteredSizeCount = data && data.sizes ? data.sizes.length : 0;
  $: filteredFoundationYearCount = data && data.foundationYears ? data.foundationYears.length : 0;

  // Close dropdowns when clicking outside
  function handleClickOutside(event) {
    const target = event.target;
    if (target && !target.closest(".dropdown-container")) {
      countryOpen = false;
      sizeOpen = false;
      foundationYearOpen = false;
      nPerCountryOpen = false;
    }
  }
</script>
{#if isMobile}
  <!-- Mobile View -->
  <div class="bg-[#3B5264]">
    <!-- Show Filters Button -->
    <div class="flex justify-center py-4">
      <button
        on:click={toggleShowFilters}
        class="px-6 py-3 border-2 border-white text-white font-whitney-book font-medium text-[16px] leading-[100%] flex items-center gap-3 hover:bg-white hover:text-[#3B5264] transition-colors duration-200"
      >
        <span>Show Filters ({activeFiltersCount})</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_3919_2889)">
            <path d="M8.33333 15H11.6667V13.3333H8.33333V15ZM2.5 5V6.66667H17.5V5H2.5ZM5 10.8333H15V9.16667H5V10.8333Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_3919_2889">
              <rect width="20" height="20" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      </button>
    </div>

    <!-- Collapsible Filters Section -->
    {#if showFilters}
      <div class="px-4 pb-4 space-y-4">
        <!-- Country Filter -->
        <div class="w-full">
          <div class="text-white font-whitney-book font-medium text-[14px] mb-2">Country</div>
          <div class="w-full">
            <CustomDropdown
              options={countryOptions}
              selectedValue={selectedCountry}
              onSelect={handleCountrySelect}
              isOpen={countryOpen}
              onToggle={toggleCountry}
            />
          </div>
        </div>

        <!-- N. per Country Filter -->
        <div class="w-full">
          <div class="text-white font-whitney-book font-medium text-[14px] mb-2">N. per country</div>
          <div class="w-full">
            <CustomDropdown
              options={nPerCountryOptions}
              selectedValue={selectedNPerCountry}
              onSelect={handleNPerCountrySelect}
              isOpen={nPerCountryOpen}
              onToggle={toggleNPerCountry}
            />
          </div>
        </div>

        <!-- Foundation Year Filter -->
        <div class="w-full">
          <div class="text-white font-whitney-book font-medium text-[14px] mb-2">Foundation Year</div>
          <div class="w-full">
            <CustomDropdown
              options={foundationYearOptions}
              selectedValue={selectedFoundationYear}
              onSelect={handleFoundationYearSelect}
              isOpen={foundationYearOpen}
              onToggle={toggleFoundationYear}
            />
          </div>
        </div>

        <!-- Reset Button -->
        <button
          on:click={resetFilters}
          class="w-full px-4 py-3 bg-white text-black font-whitney-book font-medium text-[14px] hover:bg-gray-200 transition-colors duration-200"
        >
          Reset Filters
        </button>
      </div>
    {/if}
  </div>
{:else}
  <!-- Desktop View -->
  <div
    class="flex gap-[25px] py-5 px-10 bg-[#3B5264] justify-center items-center"
  >
    <!-- Country Filter -->
    <CustomDropdown
      options={countryOptions}
      selectedValue={selectedCountry}
      onSelect={handleCountrySelect}
      isOpen={countryOpen}
      onToggle={toggleCountry}
    />

    <!-- N. per Country Filter -->
    <CustomDropdown
      options={nPerCountryOptions}
      selectedValue={selectedNPerCountry}
      onSelect={handleNPerCountrySelect}
      isOpen={nPerCountryOpen}
      onToggle={toggleNPerCountry}
    />

    <!-- Size Filter -->
    <CustomDropdown
      options={sizeOptions}
      selectedValue={selectedSize}
      onSelect={handleSizeSelect}
      isOpen={sizeOpen}
      onToggle={toggleSize}
    />

    <!-- Foundation Year Filter -->
    <CustomDropdown
      options={foundationYearOptions}
      selectedValue={selectedFoundationYear}
      onSelect={handleFoundationYearSelect}
      isOpen={foundationYearOpen}
      onToggle={toggleFoundationYear}
    />

    <!-- Reset Button -->
    <button
      on:click={resetFilters}
      class="px-4 py-2 bg-white text-black font-whitney-book font-medium text-[14px] hover:bg-gray-200 transition-colors duration-200 whitespace-nowrap"
    >
      Reset Filters
    </button>
  </div>
{/if}
