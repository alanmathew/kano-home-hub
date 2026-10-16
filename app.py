from pathlib import Path

from flask import Flask, jsonify, render_template, send_from_directory

from sensors.bme280 import BME280Sensor, SensorUnavailableError

app = Flask(__name__)

PHOTO_DIR = Path.home() / "Pictures" / "PhotoFrame"
sensor = None


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
        return jsonify(sensor.read())
    except SensorUnavailableError as error:
        app.logger.warning("BME280 unavailable: %s", error)
        return jsonify(error=str(error)), 503


@app.route("/family-photos/<path:filename>")
def family_photo(filename):
    return send_from_directory(PHOTO_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6001, debug=False)
