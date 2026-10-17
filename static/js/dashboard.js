const IDLE_MS = 3 * 60 * 1000;
const PHOTO_MS = 15 * 1000;
const SENSOR_REFRESH_MS = 15 * 1000;

const photos = JSON.parse(document.getElementById("photoData").textContent || "[]");
const screensaver = document.getElementById("screensaver");
const screensaverImage = document.getElementById("screensaverImage");
const photosButton = document.getElementById("photosButton");
const historyOverlay = document.getElementById("historyOverlay");
const historyPanel = document.getElementById("historyPanel");
const historyChart = document.getElementById("historyChart");
const historyStatus = document.getElementById("historyStatus");
const historyTitle = document.getElementById("historyTitle");
const historyDescription = document.getElementById("historyDescription");
const historyClose = document.getElementById("historyClose");
const historyRangeLabel = document.getElementById("historyRangeLabel");
const historyRangeButtons = [...document.querySelectorAll(".history-range")];
const weatherButton = document.getElementById("weatherButton");
const weatherOverlay = document.getElementById("weatherOverlay");
const weatherPanel = document.getElementById("weatherPanel");
const weatherClose = document.getElementById("weatherClose");
const locationSearchForm = document.getElementById("locationSearchForm");
const locationQuery = document.getElementById("locationQuery");
const locationResults = document.getElementById("locationResults");
const saveLocationButton = document.getElementById("saveLocationButton");
const weatherStatus = document.getElementById("weatherStatus");
const currentWeather = document.getElementById("currentWeather");
const forecastHeading = document.getElementById("forecastHeading");
const forecastList = document.getElementById("forecastList");
const HISTORY_RANGES = {
    "24h": { seconds: 24 * 60 * 60, label: "LAST 24 HOURS", ticks: 6 },
    "7d": { seconds: 7 * 24 * 60 * 60, label: "LAST 7 DAYS", ticks: 7 }
};
const SVG_NS = "http://www.w3.org/2000/svg";
const WEATHER_CACHE_MS = 15 * 60 * 1000;
const WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light rain showers",
    81: "Rain showers",
    82: "Heavy rain showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail"
};

let idleTimer = null;
let photoTimer = null;
let photoIndex = 0;
let screensaverActive = false;
let historyTrigger = null;
let selectedHistoryRange = "7d";
let selectedWeatherLocation = null;
let weatherTrigger = null;
let weatherCache = null;
let weatherCacheTime = 0;
let searchedLocations = [];
let selectedLocationCandidate = null;
let locationSearchTimer = null;
let locationSearchRequest = 0;

function updateClock() {
    const now = new Date();
    const hour = now.getHours();

    document.getElementById("clock").textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    document.getElementById("date").textContent = now.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric"
    });

    document.getElementById("screensaverTime").textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    document.getElementById("screensaverDate").textContent = now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";

    document.getElementById("greeting").textContent = greeting;
}

async function updateSensorReadings() {
    const temperature = document.getElementById("temperature");
    const humidity = document.getElementById("humidity");
    const temperatureState = document.getElementById("temperatureState");
    const humidityState = document.getElementById("humidityState");

    try {
        const response = await fetch("/api/sensors", { cache: "no-store" });
        const readings = await response.json();
        if (!response.ok) {
            throw new Error(readings.error || "Sensor request failed");
        }

        temperature.textContent = `${readings.temperature_f.toFixed(1)}°F`;
        humidity.textContent = `${readings.humidity.toFixed(1)}%`;
        temperatureState.textContent = "Live reading";
        humidityState.textContent = "Live reading";
    } catch (error) {
        console.error("Unable to update sensor readings:", error);
        temperature.textContent = "--°F";
        humidity.textContent = "--%";
        temperatureState.textContent = "Sensor unavailable";
        humidityState.textContent = "Check wiring and I2C";
    }
}

function weatherDescription(code) {
    return WEATHER_CODES[code] || "Conditions unavailable";
}

function setWeatherCardLocation(location) {
    const label = location ? location.label : "OUTSIDE";
    document.getElementById("weatherLocation").textContent = label;
    document.getElementById("weatherCardTemperature").textContent = location ? "--°F" : "Weather";
    document.getElementById("weatherCardSummary").textContent = location
        ? "Tap for local forecast"
        : "Choose a city and state";
    document.getElementById("weatherSelectedLocation").textContent = location ? location.label : "";
}

function renderWeather(forecast) {
    const current = forecast.current;
    const conditions = weatherDescription(current.weather_code);
    const currentTemperature = Math.round(current.temperature_f);
    document.getElementById("currentTemperature").textContent = `${currentTemperature}°F`;
    document.getElementById("currentCondition").textContent = conditions;
    document.getElementById("feelsLike").textContent = `${Math.round(current.feels_like_f)}°F`;
    document.getElementById("outsideHumidity").textContent = `${Math.round(current.humidity)}%`;
    document.getElementById("windSpeed").textContent = `${Math.round(current.wind_mph)} mph`;
    document.getElementById("currentRain").textContent = `${current.precipitation_in.toFixed(2)} in`;
    currentWeather.hidden = false;
    forecastHeading.hidden = false;
    forecastList.replaceChildren();

    forecast.forecast.forEach((day, index) => {
        const date = new Date(`${day.date}T12:00:00`);
        const row = document.createElement("div");
        row.className = "forecast-row";
        const dayName = index === 0
            ? "Today"
            : date.toLocaleDateString([], { weekday: "short" });
        const values = [
            ["span", "forecast-day", dayName],
            ["span", "forecast-condition", weatherDescription(day.weather_code)],
            [
                "span",
                "forecast-precip",
                `${day.precipitation_probability == null ? "--" : `${day.precipitation_probability}%`} rain`
            ],
            ["strong", "", `${Math.round(day.high_f)}°`],
            ["span", "forecast-low", `${Math.round(day.low_f)}°`]
        ];
        values.forEach(([tag, className, text]) => {
            const element = document.createElement(tag);
            if (className) element.className = className;
            element.textContent = text;
            row.appendChild(element);
        });
        forecastList.appendChild(row);
    });

    document.getElementById("weatherCardTemperature").textContent = `${currentTemperature}°F`;
    document.getElementById("weatherCardSummary").textContent = `${conditions} · ${forecast.location.label}`;
    weatherStatus.textContent = "Current conditions and 5-day forecast";
}

async function loadWeatherForecast(forceRefresh = false) {
    if (!selectedWeatherLocation) {
        weatherStatus.textContent = "Search for a city and state to see its forecast.";
        return;
    }
    if (!forceRefresh && weatherCache && Date.now() - weatherCacheTime < WEATHER_CACHE_MS) {
        renderWeather(weatherCache);
        return;
    }

    weatherStatus.textContent = "Loading forecast…";
    try {
        const response = await fetch("/api/weather/forecast", { cache: "no-store" });
        const forecast = await response.json();
        if (!response.ok) throw new Error(forecast.error || "Weather request failed");
        weatherCache = forecast;
        weatherCacheTime = Date.now();
        renderWeather(forecast);
    } catch (error) {
        console.error("Unable to load weather forecast:", error);
        weatherStatus.textContent = "Weather is unavailable. Check the Pi’s internet connection and try again.";
    }
}

async function loadSavedWeatherLocation() {
    try {
        const response = await fetch("/api/weather/location", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load saved location");
        selectedWeatherLocation = data.location;
        setWeatherCardLocation(selectedWeatherLocation);
        if (selectedWeatherLocation) loadWeatherForecast();
    } catch (error) {
        console.error("Unable to load saved weather location:", error);
        setWeatherCardLocation(null);
    }
}

function clearWeatherLocationResults() {
    locationSearchRequest += 1;
    searchedLocations = [];
    selectedLocationCandidate = null;
    saveLocationButton.disabled = true;
    locationResults.replaceChildren();
    locationResults.hidden = true;
}

async function searchWeatherLocations(query) {
    const requestId = ++locationSearchRequest;
    weatherStatus.textContent = "Searching U.S. cities…";
    try {
        const response = await fetch(`/api/weather/locations?q=${encodeURIComponent(query)}`, {
            cache: "no-store"
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Location search failed");
        if (requestId !== locationSearchRequest) return;

        searchedLocations = data.results;
        locationResults.replaceChildren();
        searchedLocations.forEach((location, index) => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "location-result";
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            option.textContent = location.label;
            option.addEventListener("click", () => {
                selectedLocationCandidate = location;
                locationResults.querySelectorAll(".location-result").forEach((result) => {
                    const isSelected = result === option;
                    result.classList.toggle("selected", isSelected);
                    result.setAttribute("aria-selected", String(isSelected));
                });
                saveLocationButton.disabled = false;
                weatherStatus.textContent = `${location.label} selected. Save this location to use its forecast.`;
            });
            locationResults.appendChild(option);
        });
        locationResults.hidden = searchedLocations.length === 0;
        if (searchedLocations.length > 0) {
            weatherStatus.textContent = "Choose a matching city, then save it.";
        } else {
            weatherStatus.textContent = "No U.S. cities matched. Try a city and state, such as Duluth, Georgia.";
        }
    } catch (error) {
        if (requestId !== locationSearchRequest) return;
        console.error("Unable to search weather locations:", error);
        weatherStatus.textContent = "Location search is unavailable. Check the Pi’s internet connection and try again.";
    }
}

async function saveWeatherLocation() {
    const selected = selectedLocationCandidate;
    if (!selected) return;

    weatherStatus.textContent = "Saving location…";
    try {
        const response = await fetch("/api/weather/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(selected)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to save location");

        selectedWeatherLocation = data.location;
        clearWeatherLocationResults();
        locationQuery.value = "";
        weatherCache = null;
        weatherCacheTime = 0;
        setWeatherCardLocation(selectedWeatherLocation);
        await loadWeatherForecast(true);
    } catch (error) {
        console.error("Unable to save weather location:", error);
        weatherStatus.textContent = "Could not save this location. Please select a city from the results.";
    }
}

function openWeather() {
    weatherTrigger = document.activeElement;
    weatherOverlay.hidden = false;
    weatherPanel.focus();
    if (selectedWeatherLocation) loadWeatherForecast();
}

function closeWeather() {
    if (weatherOverlay.hidden) return;
    weatherOverlay.hidden = true;
    weatherTrigger?.focus();
}

function addChartElement(name, attributes, text) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    if (text !== undefined) element.textContent = text;
    historyChart.appendChild(element);
    return element;
}

function drawHistoryChart(samples, unit, range) {
    historyChart.replaceChildren(historyDescription);
    if (samples.length === 0) return;

    const left = 58;
    const right = 584;
    const top = 22;
    const bottom = 226;
    const now = Date.now() / 1000;
    const start = now - HISTORY_RANGES[range].seconds;
    const values = samples.map((sample) => sample.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const padding = Math.max((max - min) * 0.12, unit === "%" ? 1 : 0.5);
    min -= padding;
    max += padding;

    for (let tick = 0; tick <= 4; tick += 1) {
        const y = top + (bottom - top) * tick / 4;
        const value = max - (max - min) * tick / 4;
        addChartElement("line", {
            x1: left, y1: y, x2: right, y2: y, class: "chart-grid-line"
        });
        addChartElement("text", {
            x: left - 9, y: y + 4, "text-anchor": "end", class: "chart-axis-label"
        }, `${value.toFixed(1)}${unit}`);
    }

    const tickCount = HISTORY_RANGES[range].ticks;
    for (let tick = 0; tick <= tickCount; tick += 1) {
        const x = left + (right - left) * tick / tickCount;
        const date = new Date((start + (now - start) * tick / tickCount) * 1000);
        const label = range === "24h"
            ? date.toLocaleTimeString([], { hour: "numeric" })
            : date.toLocaleDateString([], { month: "numeric", day: "numeric" });
        addChartElement("line", {
            x1: x, y1: top, x2: x, y2: bottom, class: "chart-grid-line chart-grid-vertical"
        });
        addChartElement("text", {
            x, y: bottom + 22, "text-anchor": "middle", class: "chart-axis-label"
        }, label);
    }

    const points = samples.map((sample) => {
        const x = left + (right - left) * (sample.timestamp - start) / (now - start);
        const y = bottom - (bottom - top) * (sample.value - min) / (max - min);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    if (points.length > 1) {
        addChartElement("polyline", { points: points.join(" "), class: "chart-line" });
    } else {
        const [cx, cy] = points[0].split(",");
        addChartElement("circle", { cx, cy, r: 5, class: "chart-point" });
    }
}

async function loadHistory() {
    const metric = historyTitle.dataset.metric;
    const range = selectedHistoryRange;
    historyRangeLabel.textContent = HISTORY_RANGES[range].label;
    historyStatus.textContent = "Loading history…";
    historyChart.replaceChildren(historyDescription);

    try {
        const response = await fetch(`/api/sensors/history?metric=${metric}&range=${range}`, {
            cache: "no-store"
        });
        const history = await response.json();
        if (!response.ok) throw new Error(history.error || "Unable to load history");

        drawHistoryChart(history.samples, history.unit, range);
        if (history.samples.length === 0) {
            historyStatus.textContent = `No readings in the last ${range === "24h" ? "24 hours" : "7 days"} yet.`;
        } else {
            historyStatus.textContent = `${history.samples.length} readings in the last ${range === "24h" ? "24 hours" : "7 days"}`;
        }
    } catch (error) {
        console.error("Unable to load sensor history:", error);
        historyStatus.textContent = "History is unavailable. Please try again.";
    }
}

function openHistory(metric) {
    historyTrigger = document.activeElement;
    historyOverlay.hidden = false;
    historyPanel.focus();
    historyTitle.dataset.metric = metric;
    historyTitle.textContent = metric === "temperature" ? "Temperature" : "Humidity";
    loadHistory();
}

function closeHistory() {
    if (historyOverlay.hidden) return;
    historyOverlay.hidden = true;
    historyTrigger?.focus();
}

function photoUrl(name) {
    return "/family-photos/" + encodeURIComponent(name);
}

function showNextPhoto() {
    if (!photos.length) return;

    const next = photos[photoIndex];
    screensaverImage.src = photoUrl(next);
    photoIndex = (photoIndex + 1) % photos.length;
}

function startScreensaver() {
    if (!photos.length || screensaverActive) return;

    screensaverActive = true;
    showNextPhoto();
    screensaver.classList.add("active");
    screensaver.setAttribute("aria-hidden", "false");

    clearInterval(photoTimer);
    photoTimer = setInterval(showNextPhoto, PHOTO_MS);
}

function stopScreensaver() {
    if (!screensaverActive) return;

    screensaverActive = false;
    screensaver.classList.remove("active");
    screensaver.setAttribute("aria-hidden", "true");
    clearInterval(photoTimer);
    photoTimer = null;
    resetIdleTimer();
}

function resetIdleTimer() {
    if (screensaverActive) return;

    clearTimeout(idleTimer);
    idleTimer = setTimeout(startScreensaver, IDLE_MS);
}

["pointerdown", "touchstart", "keydown", "mousemove"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
        if (screensaverActive) {
            stopScreensaver();
        } else {
            resetIdleTimer();
        }
    }, { passive: true });
});

photosButton.addEventListener("click", startScreensaver);
screensaver.addEventListener("click", stopScreensaver);
document.getElementById("temperatureCard").addEventListener("click", () => {
    openHistory("temperature");
});
document.getElementById("humidityCard").addEventListener("click", () => {
    openHistory("humidity");
});
weatherButton.addEventListener("click", openWeather);
weatherClose.addEventListener("click", closeWeather);
weatherOverlay.addEventListener("click", (event) => {
    if (event.target === weatherOverlay) closeWeather();
});
locationSearchForm.addEventListener("submit", (event) => {
event.preventDefault();
const query = locationQuery.value.trim();
clearTimeout(locationSearchTimer);
if (query.length < 2) {
    weatherStatus.textContent = "Enter at least two characters to search.";
    clearWeatherLocationResults();
    return;
}
searchWeatherLocations(query);
});
locationQuery.addEventListener("input", () => {
clearTimeout(locationSearchTimer);
clearWeatherLocationResults();
const query = locationQuery.value.trim();
if (query.length < 2) {
    weatherStatus.textContent = "Enter a U.S. city and state to search.";
    return;
}
locationSearchTimer = setTimeout(() => searchWeatherLocations(query), 350);
});
saveLocationButton.addEventListener("click", saveWeatherLocation);
historyRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedHistoryRange = button.dataset.range;
        historyRangeButtons.forEach((rangeButton) => {
            const isSelected = rangeButton === button;
            rangeButton.classList.toggle("active", isSelected);
            rangeButton.setAttribute("aria-pressed", String(isSelected));
        });
        loadHistory();
    });
});
historyClose.addEventListener("click", closeHistory);
historyOverlay.addEventListener("click", (event) => {
    if (event.target === historyOverlay) closeHistory();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHistory();
    if (event.key === "Escape") closeWeather();
    if (event.key === "Tab" && !historyOverlay.hidden) {
        event.preventDefault();
        historyClose.focus();
    }
    if (event.key === "Tab" && !weatherOverlay.hidden) {
        event.preventDefault();
        weatherClose.focus();
    }
});

updateClock();
setInterval(updateClock, 1000);
updateSensorReadings();
setInterval(updateSensorReadings, SENSOR_REFRESH_MS);
loadSavedWeatherLocation();
resetIdleTimer();
