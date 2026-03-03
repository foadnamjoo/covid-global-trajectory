// ******* DATA LOADING *******
// We took care of that for you
async function loadData () {
  const [covidData, mapData, populationData] = await Promise.all([
    d3.csv("data/owid-covid.csv"),
    d3.json("data/world.json"),
    d3.csv("data/country-population.csv").catch(() => [])
  ]);
  return { covidData, mapData, populationData };
}

const globalApplicationState = {
  selectedLocations: [],
  chartViewMode: "countries",
  covidData: null,
  mapData: null,
  populationData: null,
  worldMap: null,
  lineChart: null,
  populationChart: null,
  countryList: [], // { name, iso_code }[]
};


// Initialize data-driven visuals
loadData()
  .then((loadedData) => {
    globalApplicationState.covidData = loadedData.covidData;
    globalApplicationState.mapData = loadedData.mapData;
    globalApplicationState.populationData = loadedData.populationData || [];

    const worldMap = new MapVis(globalApplicationState);
    const lineChart = new LineChart(globalApplicationState);
    const populationChart = new PopulationChart(globalApplicationState);

    globalApplicationState.worldMap = worldMap;
    globalApplicationState.lineChart = lineChart;
    globalApplicationState.populationChart = populationChart;

    // Build country list (name + iso_code) for selector
    const countryMap = new Map();
    (loadedData.covidData || []).forEach((d) => {
      if (d.iso_code && d.iso_code.length === 3 && !d.iso_code.startsWith("OWID_") && d.location) {
        countryMap.set(d.iso_code, d.location);
      }
    });
    globalApplicationState.countryList = [...countryMap.entries()]
      .map(([iso_code, name]) => ({ name, iso_code }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Default: no selection so globe is full size; chart appears when user selects countries
    globalApplicationState.selectedLocations = [];

    updateChartVisibility();

    if (typeof worldMap.updateSelectedCountries === "function") {
      worldMap.updateSelectedCountries();
    }
    if (typeof lineChart.updateSelectedCountries === "function") {
      lineChart.updateSelectedCountries();
    }
    if (typeof populationChart.updateSelectedCountries === "function") {
      populationChart.updateSelectedCountries();
    }

    initCountryPanel(globalApplicationState, worldMap, lineChart);

    const clearBtn = document.getElementById("clear-button");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        globalApplicationState.selectedLocations = [];
        const countEl = document.getElementById("selected-count");
        if (countEl) countEl.textContent = "None selected";
        updateChartVisibility();
        if (typeof worldMap.updateSelectedCountries === "function") {
          worldMap.updateSelectedCountries();
        }
        if (typeof lineChart.updateSelectedCountries === "function") {
          lineChart.updateSelectedCountries();
        }
        if (typeof populationChart.updateSelectedCountries === "function") {
          populationChart.updateSelectedCountries();
        }
      });
    }

    const mapTypeSelect = document.getElementById("map-type");
    if (mapTypeSelect) {
      mapTypeSelect.addEventListener("change", (e) => {
        if (worldMap && typeof worldMap.setProjection === "function") {
          worldMap.setProjection(e.target.value);
        }
      });
    }
  })
  .catch((err) => {
    console.error("Error loading data for COVID visualization:", err);
  });


// --- Country selection panel ---
function initCountryPanel(state, worldMap, lineChart) {
  const searchEl = document.getElementById("country-search");
  const dropdownEl = document.getElementById("country-dropdown");
  const selectAllBtn = document.getElementById("select-all-btn");
  const clearBtn = document.getElementById("clear-select-btn");
  const countEl = document.getElementById("selected-count");
  if (!searchEl || !dropdownEl || !state.countryList.length) return;

  function getSelectedSet() {
    return new Set(state.selectedLocations || []);
  }

  function syncMapAndChart() {
    updateChartVisibility();
    if (worldMap && typeof worldMap.updateSelectedCountries === "function") {
      worldMap.updateSelectedCountries();
    }
    if (lineChart && typeof lineChart.updateSelectedCountries === "function") {
      lineChart.updateSelectedCountries();
    }
    if (state.populationChart && typeof state.populationChart.updateSelectedCountries === "function") {
      state.populationChart.updateSelectedCountries();
    }
  }

  function updateCount() {
    if (countEl) {
      const n = (state.selectedLocations || []).length;
      countEl.textContent = n ? `${n} selected` : "None selected";
    }
  }

  function openDropdown() {
    const q = (searchEl.value.trim().toLowerCase()) || "";
    const selected = getSelectedSet();
    const filtered = q
      ? state.countryList.filter((c) => c.name.toLowerCase().includes(q))
      : state.countryList;

    dropdownEl.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "country-dropdown-empty";
      empty.textContent = q ? "No countries match" : "Type to search";
      dropdownEl.appendChild(empty);
    } else {
      filtered.forEach((c) => {
        const opt = document.createElement("div");
        opt.className = "country-dropdown-option" + (selected.has(c.iso_code) ? " selected" : "");
        opt.textContent = c.name;
        opt.dataset.iso = c.iso_code;
        opt.addEventListener("click", () => {
          const sel = state.selectedLocations || [];
          const idx = sel.indexOf(c.iso_code);
          if (idx === -1) {
            state.selectedLocations = sel.concat(c.iso_code);
          } else {
            state.selectedLocations = sel.filter((x) => x !== c.iso_code);
          }
          syncMapAndChart();
          updateCount();
          openDropdown();
        });
        dropdownEl.appendChild(opt);
      });
    }
    dropdownEl.classList.add("open");
    dropdownEl.setAttribute("aria-hidden", "false");
  }

  function closeDropdown() {
    dropdownEl.classList.remove("open");
    dropdownEl.setAttribute("aria-hidden", "true");
  }

  searchEl.addEventListener("focus", openDropdown);
  searchEl.addEventListener("input", openDropdown);

  searchEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });

  document.addEventListener("click", (e) => {
    if (dropdownEl.classList.contains("open") && !searchEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      closeDropdown();
    }
  });

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      state.selectedLocations = state.countryList.map((c) => c.iso_code);
      closeDropdown();
      searchEl.value = "";
      syncMapAndChart();
      updateCount();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.selectedLocations = [];
      closeDropdown();
      searchEl.value = "";
      syncMapAndChart();
      updateCount();
    });
  }
  window.addEventListener("countrySelectionChanged", () => { updateChartVisibility(); updateCount(); closeDropdown(); });

  updateCount();
}

// --- Help / info overlay ---
function initInfoOverlay () {
  const box = document.getElementById("info-box");
  const btn = document.getElementById("help-button");
  const closeBtn = document.getElementById("info-close");

  if (!box || !btn || !closeBtn) return;

  const toggleInfo = (show) => {
    if (show === undefined) {
      box.classList.toggle("info-box-hidden");
    } else {
      box.classList.toggle("info-box-hidden", !show);
    }
    const hidden = box.classList.contains("info-box-hidden");
    box.setAttribute("aria-hidden", String(hidden));
    btn.setAttribute("aria-expanded", String(!hidden));
  };

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleInfo();
  });

  closeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleInfo(false);
  });

  // Hide info when clicking anywhere outside the button or info box
  document.addEventListener("click", (event) => {
    if (box.classList.contains("info-box-hidden")) return;
    if (box.contains(event.target) || btn.contains(event.target)) return;
    toggleInfo(false);
  });
}


// --- Chart visibility: show plot only when countries selected ---
function updateChartVisibility () {
  const state = globalApplicationState;
  const wrap = document.getElementById("chart-wrap");
  if (!wrap) return;
  const hasSelection = state.selectedLocations && state.selectedLocations.length > 0;
  wrap.classList.toggle("visible", hasSelection);
  wrap.setAttribute("aria-hidden", hasSelection ? "false" : "true");
  fitScale();
}

// --- Layout scaling (one-page, no scroll) ---
function fitScale () {
  const wrap = document.querySelector(".viz-wrap");
  if (!wrap) return;
  const pad = 0;
  const mapSize = 720;
  const chartW = 860;
  const gap = 16;
  const chartWrap = document.getElementById("chart-wrap");
  const chartVisible = chartWrap && chartWrap.classList.contains("visible");
  const contentW = chartVisible ? mapSize + gap + chartW : mapSize;
  const panelH = 52;
  const titleH = 32;
  const contentH = panelH + 2 + titleH + 2 + mapSize + 2 + 40;
  const scale = Math.min(
    (window.innerWidth - pad) / contentW,
    (window.innerHeight - pad) / contentH,
    1
  );
  wrap.style.setProperty("--scale", scale);
}

// Because the script is loaded with `defer`, the DOM is ready here.
initInfoOverlay();
fitScale();
window.addEventListener("resize", fitScale);

