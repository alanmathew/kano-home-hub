from pathlib import Path

from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

PHOTO_DIR = Path.home() / "Pictures" / "PhotoFrame"


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


@app.route("/family-photos/<path:filename>")
def family_photo(filename):
    return send_from_directory(PHOTO_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
