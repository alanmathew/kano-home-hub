import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class WeatherServiceError(RuntimeError):
    """Raised when an Open-Meteo request fails or returns invalid data."""


def _get_json(url):
    request = Request(url, headers={"User-Agent": "KanoHomeHub/1.0"})
    try:
        with urlopen(request, timeout=10) as response:
            return json.load(response)
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        raise WeatherServiceError("Weather service request failed.") from error


def search_us_locations(query):
    params = urlencode(
        {
            "name": query,
            "count": 10,
            "language": "en",
            "format": "json",
            "countryCode": "US",
        }
    )
    response = _get_json(f"https://geocoding-api.open-meteo.com/v1/search?{params}")
    results = []
    for result in response.get("results", []):
        if result.get("country_code") != "US":
            continue
        state = result.get("admin1", "")
        results.append(
            {
                "name": result["name"],
                "state": state,
                "country_code": result["country_code"],
                "label": f"{result['name']}, {state}" if state else result["name"],
                "latitude": result["latitude"],
                "longitude": result["longitude"],
            }
        )
    return results


def get_forecast(location):
    params = urlencode(
        {
            "latitude": location["latitude"],
            "longitude": location["longitude"],
            "current": (
                "temperature_2m,relative_humidity_2m,apparent_temperature,"
                "precipitation,weather_code,wind_speed_10m"
            ),
            "daily": (
                "weather_code,temperature_2m_max,temperature_2m_min,"
                "precipitation_probability_max"
            ),
            "temperature_unit": "fahrenheit",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timezone": "auto",
            "forecast_days": 5,
        }
    )
    response = _get_json(f"https://api.open-meteo.com/v1/forecast?{params}")
    try:
        current = response["current"]
        daily = response["daily"]
        forecast = [
            {
                "date": daily["time"][index],
                "weather_code": daily["weather_code"][index],
                "high_f": daily["temperature_2m_max"][index],
                "low_f": daily["temperature_2m_min"][index],
                "precipitation_probability": daily[
                    "precipitation_probability_max"
                ][index],
            }
            for index in range(len(daily["time"]))
        ]
        return {
            "location": location,
            "current": {
                "temperature_f": current["temperature_2m"],
                "feels_like_f": current["apparent_temperature"],
                "humidity": current["relative_humidity_2m"],
                "wind_mph": current["wind_speed_10m"],
                "precipitation_in": current["precipitation"],
                "weather_code": current["weather_code"],
            },
            "forecast": forecast,
        }
    except (KeyError, IndexError, TypeError) as error:
        raise WeatherServiceError("Weather service returned invalid forecast data.") from error
