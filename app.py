from pathlib import Path
import sqlite3
import time

from flask import Flask, jsonify, render_template, request, send_from_directory

from sensors.bme280 import BME280Sensor, SensorUnavailableError

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
    return connection


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


@app.route("/family-photos/<path:filename>")
def family_photo(filename):
    return send_from_directory(PHOTO_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6001, debug=False)
