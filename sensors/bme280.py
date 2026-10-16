class SensorUnavailableError(RuntimeError):
    """Raised when the BME280 cannot be initialized or read."""


class BME280Sensor:
    def __init__(self):
        try:
            import adafruit_bme280.basic
            import board
        except ImportError as error:
            raise SensorUnavailableError(
                "Install the BME280 dependencies from requirements.txt."
            ) from error

        try:
            i2c = board.I2C()
            addresses = i2c.scan()
        except (OSError, RuntimeError, NotImplementedError) as error:
            raise SensorUnavailableError(
                "I2C is unavailable. Enable I2C and check the sensor wiring."
            ) from error

        address = next((value for value in (0x76, 0x77) if value in addresses), None)
        if address is None:
            raise SensorUnavailableError(
                "No BME280 found at I2C address 0x76 or 0x77. "
                "Check its wiring and I2C address."
            )

        try:
            self._sensor = adafruit_bme280.basic.Adafruit_BME280_I2C(
                i2c, address=address
            )
        except (OSError, RuntimeError, NotImplementedError) as error:
            raise SensorUnavailableError(
                "Could not initialize the BME280. Check the sensor wiring."
            ) from error

    def read(self):
        try:
            temperature_f = self._sensor.temperature * 9 / 5 + 32
            humidity = self._sensor.relative_humidity
        except (OSError, RuntimeError, NotImplementedError) as error:
            raise SensorUnavailableError(
                "Could not read the BME280. Check the sensor connection."
            ) from error

        return {
            "temperature_f": round(temperature_f, 1),
            "humidity": round(humidity, 1),
        }
