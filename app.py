from flask import Flask, render_template
from pathlib import Path

app = Flask(__name__)

PHOTO_DIR = Path.home() / "Pictures" / "PhotoFrame"

@app.route("/")
def home():
    photos = []

    if PHOTO_DIR.exists():
        for f in PHOTO_DIR.iterdir():
            if f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                photos.append(f.name)

    return render_template("home.html", photos=photos)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)