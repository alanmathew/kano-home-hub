# Lesson 01 — How the Home Hub Works

## What are we building?

We are turning a small Raspberry Pi computer into a touchscreen Home Hub.

The screen that we see is actually a **web page**, but instead of living on the Internet, it is created by our own Raspberry Pi.

## The four important pieces

### 1. Python

Python runs our application.

The main Python file is:

```text
app.py
```

### 2. Flask

Flask is a small Python web framework.

When we open:

```text
http://localhost:5000
```

Flask sends the Home Hub page to the browser.

### 3. HTML

HTML describes what appears on the screen:

- headings
- buttons
- temperature cards
- weather
- calendar
- photos

Our main page is:

```text
templates/home.html
```

### 4. CSS and JavaScript

CSS controls how the dashboard looks.

```text
static/css/dashboard.css
```

JavaScript makes the page interactive.

```text
static/js/dashboard.js
```

JavaScript currently:

- updates the clock
- changes the greeting
- watches for inactivity
- starts the photo screensaver
- changes photos
- returns to Home when the screen is touched

## Try this experiment

Find this line in `dashboard.js`:

```javascript
const PHOTO_MS = 15 * 1000;
```

The value means 15 seconds.

Change `15` to `5`, restart the app, and see what happens.

That is programming: change an instruction, run it, observe the result, and improve it.
