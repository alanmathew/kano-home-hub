const IDLE_MS = 3 * 60 * 1000;
const PHOTO_MS = 15 * 1000;

const photos = JSON.parse(document.getElementById("photoData").textContent || "[]");
const screensaver = document.getElementById("screensaver");
const screensaverImage = document.getElementById("screensaverImage");
const photosButton = document.getElementById("photosButton");

let idleTimer = null;
let photoTimer = null;
let photoIndex = 0;
let screensaverActive = false;

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

updateClock();
setInterval(updateClock, 1000);
resetIdleTimer();
