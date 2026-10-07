# Kano Home Hub Architecture

## Goal

Turn the Kano Computer Kit Touch into a lightweight family smart-home dashboard while keeping the code understandable enough for a child to learn from.

## Runtime flow

```text
Raspberry Pi OS Bookworm
        |
      Python
        |
      Flask
        |
 HTML + CSS + JavaScript
        |
 Chromium kiosk mode
        |
 Kano 10.1" touchscreen
```

## Design principles

1. Keep the Raspberry Pi 3 responsive.
2. Avoid heavy front-end frameworks.
3. Use local SVG icons so the UI works offline.
4. Keep family photos and secrets outside GitHub.
5. Add one feature at a time and document what it teaches.

## Home screen

The dashboard is optimized for the Kano's 1280×800 touchscreen and uses large touch targets.

Current modules:

- Temperature
- Humidity
- Air quality
- Weather
- Calendar
- To-Do
- Timer
- Photos
- Settings

The sensor cards currently show placeholders. The BME280 integration will replace temperature and humidity placeholders with real readings.

## Photo screensaver

Photos remain on the Raspberry Pi in:

```text
~/Pictures/PhotoFrame/
```

Flask exposes those files only to the local dashboard through the `/family-photos/<filename>` route.

After three minutes of inactivity:

```text
Dashboard -> Photo screensaver -> Touch -> Dashboard
```

Photos change every 15 seconds.

## Future architecture

```text
 BME280 / Air Sensors
          |
          v
   Raspberry Pi 3
          |
   Flask Home Hub
          |
   SQLite history
          |
   Touchscreen UI
          |
      Wi-Fi / MQTT
          |
        ESP32
          |
 Sensors / Robot / IoT

Future AI computer
(Jetson or similar)
          |
       Network
          |
      Home Hub
```

## Security

Never commit:

- family photos
- Wi-Fi passwords
- API keys
- passwords
- SSH keys
- personal calendar data
- local databases
