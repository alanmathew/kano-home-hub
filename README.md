# 🏠 Kano Home Hub

A family learning project that turns an old **Kano Computer Kit Touch / Raspberry Pi 3** into a touchscreen smart home dashboard, digital photo frame, environmental monitor, IoT controller, robotics console, and eventually a small AI-powered home assistant.

The main purpose of this project is not just to build something useful.

It is also designed to teach:

- Raspberry Pi
- Linux
- Python
- HTML / CSS / JavaScript
- Git and GitHub
- Sensors and electronics
- ESP32 / IoT
- APIs
- Databases
- Robotics
- Networking
- Automation
- AI and machine learning

---

# 🎯 Project Goal

We are building a touchscreen **Home Hub** for the family.

Eventually the Kano should boot directly into a screen similar to:

```text
┌────────────────────────────────────────────┐
│ 🏠 HOME HUB                 10:30 AM       │
│                            Oct 7, 2026     │
│                                            │
│ 🌡 Temperature     💧 Humidity             │
│     72.4°F             44%                 │
│                                            │
│ 🫁 Air Quality     🌤 Outside              │
│     GOOD               68°F                │
│                                            │
│ ───── Temperature - Last 24 Hours ──────   │
│                                            │
│ [Weather] [Calendar] [To-Do] [Photos]      │
│ [Timer]   [Sensors]  [Robot] [Settings]    │
└────────────────────────────────────────────┘
```

When nobody uses the screen for a few minutes, it will automatically become a **digital family photo frame**.

Touching the screen will return to the Home Hub.

---

# 🖥 Hardware

## Kano Computer Kit Touch

Our Kano contains:

- Raspberry Pi 3
- 1 GB RAM
- 10.1-inch 1280×800 touchscreen
- Keyboard + trackpad
- Speaker
- Wi-Fi
- GPIO interface
- 64 GB microSD for the new Home Hub OS

The original **16 GB Kano microSD card is being preserved** and will not be modified.

---

# 💿 Operating System

We replaced the old Kano OS with:

**Raspberry Pi OS Legacy (32-bit)**  
**Debian Bookworm**

Current configuration:

```text
Hostname: luke-kano
Username: homehub
SSH: Enabled
Wi-Fi: Enabled
I2C: Enabled
```

The Kano can be accessed from our Mac with:

```bash
ssh homehub@luke-kano.local
```

---

# ✅ Hardware Already Tested

The following components are working:

| Component | Status |
|---|---|
| Raspberry Pi 3 | ✅ |
| 10.1" Display | ✅ |
| Touchscreen | ✅ |
| Wi-Fi | ✅ |
| SSH | ✅ |
| Keyboard | ✅ |
| Trackpad | ✅ |
| Video playback | ✅ |
| Audio | ✅ Working, but quiet |
| I2C | ✅ |
| 64 GB microSD | ✅ |

---

# 📸 Photo Screensaver

The Kano already successfully displays family photographs.

Photos are stored locally in:

```text
~/Pictures/PhotoFrame/
```

The final Home Hub will automatically start the photo slideshow when the touchscreen has been idle.

Example:

```text
HOME HUB
    │
    │ No activity for 3 minutes
    ▼
PHOTO FRAME
    │
    │ Photo changes every 15 seconds
    ▼
PHOTO FRAME
    │
    │ Screen touched
    ▼
HOME HUB
```

Family photos will **NOT** be committed to GitHub.

---

# 🌡 Environmental Monitoring

The Home Hub will monitor the environment inside the house.

## Phase 1 Sensor

### BME280

The first sensor will measure:

- Temperature
- Humidity
- Atmospheric pressure

Connection:

```text
BME280
   │
   │ I2C
   ▼
Raspberry Pi
   │
   ▼
Python
   │
   ▼
Home Hub Dashboard
```

---

# 🌬 Future Air Quality Sensors

Later we may add:

### PM2.5 Sensor

Measures airborne particles such as:

- PM1
- PM2.5
- PM10

### CO₂ Sensor

A sensor such as the SCD40/SCD41 can measure actual indoor carbon dioxide.

The dashboard could eventually show:

```text
Temperature     72°F
Humidity        44%
CO₂             650 ppm
PM2.5           6 µg/m³
Pressure        1015 hPa

AIR QUALITY
    GOOD
```

---

# 🌤 Outdoor Weather

Indoor measurements will come from our physical sensors.

Outdoor information will come from an Internet weather service.

Examples:

- Outside temperature
- Forecast
- Rain
- Humidity
- Air Quality Index
- Severe weather alerts

This teaches how computers communicate with **APIs**.

---

# 📅 Home Hub Applications

Planned applications include:

### 🌤 Weather

Indoor and outdoor conditions.

### 📅 Calendar

Family events and activities.

### ✅ To-Do List

Simple family task management.

### ⏱ Timer

Timers and stopwatch.

### 📝 Notes

Simple household notes.

### 🖼 Photo Frame

Family photo slideshow.

### 🌡 Sensors

Detailed environmental information.

### 🤖 Robot

Future robot control and camera interface.

### ⚙ Settings

Configure Home Hub behavior.

---

# 💾 Sensor History

Sensor readings will eventually be stored locally.

Example:

```text
10:00  71.8°F  43%
10:05  72.0°F  43%
10:10  72.1°F  44%
10:15  72.3°F  44%
```

This will allow graphs showing:

```text
Temperature — Last 24 Hours

74 |             ╭───
73 |        ╭────╯
72 |   ╭────╯
71 |───╯
   └────────────────────
     6AM  12PM  6PM
```

We plan to use **SQLite** for local storage.

---

# 🧠 Software Architecture

The initial application will use:

```text
Raspberry Pi OS
       │
       ▼
     Python
       │
       ▼
     Flask
       │
       ▼
 HTML + CSS + JavaScript
       │
       ▼
 Chromium Kiosk Mode
       │
       ▼
 Kano Touchscreen
```

The application will eventually start automatically when the Kano boots.

---

# 🗂 Planned Project Structure

```text
kano-home-hub/
│
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── templates/
│   └── home.html
│
├── static/
│   ├── css/
│   ├── js/
│   └── photos/
│
├── sensors/
│   ├── bme280.py
│   ├── air_quality.py
│   └── co2.py
│
├── services/
│   ├── weather.py
│   ├── photos.py
│   └── reminders.py
│
├── data/
│   └── homehub.db
│
└── docs/
    ├── 01-raspberry-pi.md
    ├── 02-linux.md
    ├── 03-python.md
    ├── 04-web-apps.md
    ├── 05-git-github.md
    ├── 06-sensors.md
    ├── 07-iot.md
    ├── 08-robotics.md
    └── architecture.md
```

---

# 👨‍💻 Development Workflow

Development happens primarily on the Mac using **VS Code**.

```text
MacBook
   │
   │ VS Code
   ▼
Write Code
   │
   ▼
Test
   │
   ▼
Git Commit
   │
   ▼
GitHub
   │
   │ git pull
   ▼
Kano Raspberry Pi
   │
   ▼
Home Hub
```

This gives us a real software engineering workflow.

---

# 📝 Git History

We want the Git history to tell the story of the project.

Example:

```text
Initial Kano Home Hub
        ↓
Add clock and date
        ↓
Add photo screensaver
        ↓
Add BME280 sensor
        ↓
Add weather
        ↓
Add sensor history
        ↓
Add To-Do
        ↓
Add calendar
        ↓
Add ESP32
        ↓
Add robot
        ↓
Add voice assistant
        ↓
Add AI
```

---

# 📡 ESP32 IoT Expansion

The project will eventually include an **ESP32**.

Instead of every sensor being physically connected to the Kano, ESP32 devices can collect measurements around the house.

Example:

```text
Bedroom ESP32
      │
   Wi-Fi
      │
      ▼
Kano Home Hub


Living Room ESP32
      │
   Wi-Fi
      │
      ▼
Kano Home Hub
```

This introduces:

- IoT
- Wi-Fi communication
- MQTT
- distributed sensors
- microcontrollers

---

# 🤖 Robotics Expansion

We also have a SunFounder Raspberry Pi Smart Video Car project.

Future architecture:

```text
             KANO HOME HUB
                   │
                 Wi-Fi
                   │
                   ▼
               ROBOT CAR
             ┌─────┴─────┐
             │           │
          Camera       Motors
             │
           Servos
```

Eventually the Home Hub could display:

```text
┌───────────────────────────────────┐
│          ROBOT CAMERA             │
│                                   │
│        [ LIVE VIDEO ]             │
│                                   │
│              ▲                    │
│           ◀  ●  ▶                 │
│              ▼                    │
│                                   │
│      Camera Pan / Tilt            │
└───────────────────────────────────┘
```

---

# 🗣 Voice Assistant — Future

Later we can add:

- Microphone
- Speaker
- Speech recognition
- Text-to-speech

Example commands:

```text
"What is the temperature?"

"Set a timer for 10 minutes."

"What's the weather tomorrow?"

"Add milk to the shopping list."

"Show the robot camera."
```

---

# 🧠 AI — Future Phase

AI is intentionally **not the first step**.

First we learn:

```text
Computer
   ↓
Linux
   ↓
Python
   ↓
Web Development
   ↓
Sensors
   ↓
IoT
   ↓
Robotics
   ↓
AI
```

Later a more powerful AI computer such as an NVIDIA Jetson could work alongside the Kano.

Example:

```text
             HOME AI SYSTEM

       ┌────────────────────┐
       │ AI Computer        │
       │ LLM / Vision / ML  │
       └─────────┬──────────┘
                 │
              Network
                 │
       ┌─────────┴─────────┐
       │                   │
   Kano Home Hub       Robot
       │                   │
    Sensors              Camera
       │
     ESP32
```

The Kano does not need to perform all the AI processing itself.

---

# 🎓 Learning Goals

This project is designed so a child can learn by changing real things.

## Level 1 — Computers

Learn:

- Files
- Folders
- Linux
- Terminal
- SSH

## Level 2 — Programming

Learn:

- Python
- Variables
- Functions
- Loops
- Conditions

## Level 3 — Web Development

Learn:

- HTML
- CSS
- JavaScript
- Flask

## Level 4 — Electronics

Learn:

- GPIO
- Voltage
- Ground
- I2C
- Sensors

## Level 5 — IoT

Learn:

- ESP32
- Wi-Fi
- APIs
- MQTT

## Level 6 — Robotics

Learn:

- Motors
- Servos
- Cameras
- Sensors
- Remote control

## Level 7 — AI

Learn:

- Computer vision
- Machine learning
- Voice recognition
- LLMs
- AI agents

---

# 🛣 Project Roadmap

- [x] Restore Kano hardware
- [x] Install Raspberry Pi OS
- [x] Configure Wi-Fi
- [x] Configure SSH
- [x] Verify touchscreen
- [x] Verify video
- [x] Verify audio
- [x] Enable I2C
- [x] Test photo slideshow
- [ ] Create Home Hub dashboard
- [ ] Integrate photo screensaver
- [ ] Connect BME280
- [ ] Display temperature
- [ ] Display humidity
- [ ] Display pressure
- [ ] Add outdoor weather
- [ ] Store sensor history
- [ ] Add graphs
- [ ] Add timer
- [ ] Add To-Do list
- [ ] Add calendar
- [ ] Add photo settings
- [ ] Auto-start Home Hub at boot
- [ ] Chromium kiosk mode
- [ ] Add PM2.5 sensor
- [ ] Add CO₂ sensor
- [ ] Add ESP32
- [ ] Add wireless sensors
- [ ] Integrate robot
- [ ] Add camera
- [ ] Add voice
- [ ] Add smart-home controls
- [ ] Explore AI integration

---

# 🔐 Privacy and Security

The following should never be committed to GitHub:

- Family photos
- Wi-Fi passwords
- API keys
- Passwords
- SSH private keys
- Personal calendar data
- Local databases

These will be excluded using `.gitignore` and environment variables.

---

# 👨‍👩‍👧 Why We Are Building This

The goal isn't simply to make a smart display.

The goal is to learn how technology works by building something useful together.

Every feature introduces a new concept:

```text
Photo Frame   → Files + JavaScript
Weather       → APIs
BME280        → Electronics + I2C
Graphs        → Data
To-Do         → Databases
ESP32         → IoT
Robot         → Robotics
Voice         → Speech Processing
AI            → Machine Learning
```

Instead of only using technology, we learn how to **build it**.

---

# 🚀 Current Milestone

## Home Hub V1

Our next milestone is:

**Touchscreen Dashboard + Clock + Photo Screensaver**

After that:

**BME280 Temperature / Humidity / Pressure Sensor**

And we'll build each feature as a small, understandable lesson.

---

# 🎨 Modern Dashboard Design

The Home Hub now uses a lightweight modern touchscreen interface designed specifically for the Kano's 1280×800 display.

The design uses:

- large touch-friendly cards
- local SVG icons
- glass-style panels
- high-contrast typography
- responsive layouts
- no heavy JavaScript framework

This keeps the Raspberry Pi 3 responsive while still making the Home Hub feel like a finished smart-home product.

The dashboard code is separated into:

```text
templates/home.html
static/css/dashboard.css
static/js/dashboard.js
```

The photo screensaver is integrated directly into the dashboard. After three minutes of inactivity, local family photos begin playing full-screen and change every 15 seconds. Touching the display returns to Home.

For a child-friendly explanation of the code, see:

```text
docs/01-home-hub-basics.md
docs/architecture.md
```
