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
const HISTORY_RANGES = {
    "24h": { seconds: 24 * 60 * 60, label: "LAST 24 HOURS", ticks: 6 },
    "7d": { seconds: 7 * 24 * 60 * 60, label: "LAST 7 DAYS", ticks: 7 }
};
const SVG_NS = "http://www.w3.org/2000/svg";

let idleTimer = null;
let photoTimer = null;
let photoIndex = 0;
let screensaverActive = false;
let historyTrigger = null;
let selectedHistoryRange = "7d";

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
    if (event.key === "Tab" && !historyOverlay.hidden) {
        event.preventDefault();
        historyClose.focus();
    }
});

updateClock();
setInterval(updateClock, 1000);
updateSensorReadings();
setInterval(updateSensorReadings, SENSOR_REFRESH_MS);
resetIdleTimer();
