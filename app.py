import math
import sqlite3
import time
from pathlib import Path
import math

from flask import Flask, jsonify, render_template, request, send_from_directory

from sensors.bme280 import BME280Sensor, SensorUnavailableError
from services.weather import (
    WeatherServiceError,
    get_forecast,
    search_us_locations,
)

app = Flask(__name__)

PHOTO_DIR = Path.home() / "Pictures" / "PhotoFrame"
SENSOR_HISTORY_DB = Path(__file__).resolve().parent / "data" / "sensor_history.db"
SENSOR_HISTORY_SECONDS = 7 * 24 * 60 * 60
SENSOR_SAMPLE_INTERVAL_SECONDS = 5 * 60
SENSOR_HISTORY_RANGES = {
    "24h": 24 * 60 * 60,
    "7d": SENSOR_HISTORY_SECONDS,
}
HISTORY_METRICS = {
    "temperature": ("temperature_f", "Temperature", "°F"),
    "humidity": ("humidity", "Humidity", "%"),
}
sensor = None


def open_sensor_history_db():
    SENSOR_HISTORY_DB.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(SENSOR_HISTORY_DB, timeout=10)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY,
            recorded_at REAL NOT NULL,
            temperature_f REAL NOT NULL,
            humidity REAL NOT NULL
        )
        """
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS sensor_readings_recorded_at "
        "ON sensor_readings (recorded_at)"
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS weather_location (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            state TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL
        )
        """
    )
    return connection


def get_weather_location():
    with open_sensor_history_db() as connection:
        row = connection.execute(
            "SELECT name, state, latitude, longitude "
            "FROM weather_location WHERE id = 1"
        ).fetchone()
    if row is None:
        return None
    name, state, latitude, longitude = row
    return {
        "name": name,
        "state": state,
        "label": f"{name}, {state}" if state else name,
        "latitude": latitude,
        "longitude": longitude,
    }


def save_weather_location(location):
    with open_sensor_history_db() as connection:
        connection.execute(
            """
            INSERT INTO weather_location (id, name, state, latitude, longitude)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                state = excluded.state,
                latitude = excluded.latitude,
                longitude = excluded.longitude
            """,
            (
                location["name"],
                location["state"],
                location["latitude"],
                location["longitude"],
            ),
        )


def save_sensor_reading(reading):
    now = time.time()
    with open_sensor_history_db() as connection:
        latest = connection.execute(
            "SELECT MAX(recorded_at) FROM sensor_readings"
        ).fetchone()[0]
        if latest is None or now - latest >= SENSOR_SAMPLE_INTERVAL_SECONDS:
            connection.execute(
                """
                INSERT INTO sensor_readings
                    (recorded_at, temperature_f, humidity)
                VALUES (?, ?, ?)
                """,
                (now, reading["temperature_f"], reading["humidity"]),
            )
            connection.execute(
                "DELETE FROM sensor_readings WHERE recorded_at < ?",
                (now - SENSOR_HISTORY_SECONDS,),
            )


@app.route("/")
def home():
    photos = []

    if PHOTO_DIR.exists():
        photos = sorted(
            file.name
            for file in PHOTO_DIR.iterdir()
            if file.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )

    return render_template("home.html", photos=photos)


@app.route("/api/sensors")
def sensor_readings():
    global sensor

    try:
        if sensor is None:
            sensor = BME280Sensor()
        reading = sensor.read()
        save_sensor_reading(reading)
        return jsonify(reading)
    except SensorUnavailableError as error:
        app.logger.warning("BME280 unavailable: %s", error)
        return jsonify(error=str(error)), 503


@app.route("/api/sensors/history")
def sensor_history():
    metric = request.args.get("metric", "")
    if metric not in HISTORY_METRICS:
        return jsonify(error="Choose temperature or humidity."), 400

    range_name = request.args.get("range", "7d")
    if range_name not in SENSOR_HISTORY_RANGES:
        return jsonify(error="Choose a 24-hour or 7-day history range."), 400

    column, label, unit = HISTORY_METRICS[metric]
    cutoff = time.time() - SENSOR_HISTORY_RANGES[range_name]
    with open_sensor_history_db() as connection:
        rows = connection.execute(
            f"SELECT recorded_at, {column} FROM sensor_readings "
            "WHERE recorded_at >= ? ORDER BY recorded_at",
            (cutoff,),
        ).fetchall()

    return jsonify(
        metric=metric,
        label=label,
        unit=unit,
        range=range_name,
        samples=[
            {"timestamp": recorded_at, "value": value}
            for recorded_at, value in rows
        ],
    )


@app.route("/api/weather/locations")
def weather_locations():
    query = request.args.get("q", "").strip()
    if len(query) < 2 or len(query) > 100:
        return jsonify(error="Enter at least two characters for the city search."), 400

    try:
        return jsonify(results=search_us_locations(query))
    except WeatherServiceError as error:
        app.logger.error("Weather location search failed: %s", error)
        return jsonify(error=str(error)), 502


@app.route("/api/weather/location", methods=["GET", "POST"])
def weather_location():
    if request.method == "GET":
        return jsonify(location=get_weather_location())

    location = request.get_json(silent=True)
    if not isinstance(location, dict):
        return jsonify(error="Choose a city from the search results."), 400

    name = location.get("name")
    state = location.get("state")
    country_code = location.get("country_code")
    latitude = location.get("latitude")
    longitude = location.get("longitude")
    if (
        not isinstance(name, str)
        or not name.strip()
        or len(name) > 100
        or not isinstance(state, str)
        or not state.strip()
        or len(state) > 100
        or country_code != "US"
        or type(latitude) not in (int, float)
        or not math.isfinite(latitude)
        or not -90 <= latitude <= 90
        or type(longitude) not in (int, float)
        or not math.isfinite(longitude)
        or not -180 <= longitude <= 180
    ):
        return jsonify(error="Choose a valid U.S. city and state from the results."), 400

    selected = {
        "name": name.strip(),
        "state": state.strip(),
        "latitude": float(latitude),
        "longitude": float(longitude),
    }
    save_weather_location(selected)
    return jsonify(location=get_weather_location())


@app.route("/api/weather/forecast")
def weather_forecast():
    location = get_weather_location()
    if location is None:
        return jsonify(error="Choose a city and state to get the forecast."), 400

    try:
        return jsonify(get_forecast(location))
    except WeatherServiceError as error:
        app.logger.error("Weather forecast request failed: %s", error)
        return jsonify(error=str(error)), 502


@app.route("/family-photos/<path:filename>")
def family_photo(filename):
    return send_from_directory(PHOTO_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6001, debug=False)
