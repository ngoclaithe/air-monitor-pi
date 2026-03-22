import json
import threading
import time

import serial
import serial.tools.list_ports

from config import load_config
from models import insert_reading


class SerialReader:
    def __init__(self, socketio):
        self.socketio = socketio
        self._running = False
        self._thread = None
        self._port = None
        self._connected = False
        self._last_data = None

    @property
    def connected(self):
        return self._connected

    @property
    def last_data(self):
        return self._last_data

    @staticmethod
    def list_ports():
        ports = serial.tools.list_ports.comports()
        return [{"device": p.device, "description": p.description} for p in ports]

    def start(self):
        if self._running:
            return False
        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()
        return True

    def stop(self):
        self._running = False
        if self._port and self._port.is_open:
            self._port.close()
        self._connected = False
        self._thread = None
        self.socketio.emit("serial_status", {"connected": False})
        return True

    def _read_loop(self):
        cfg = load_config()
        print(f"\n{'='*50}")
        print(f"[SERIAL] Dang mo cong {cfg['serial_port']} @ {cfg['baud_rate']} baud (8N1)")
        print(f"{'='*50}")
        while self._running:
            try:
                self._port = serial.Serial(
                    port=cfg["serial_port"],
                    baudrate=cfg["baud_rate"],
                    bytesize=8,
                    stopbits=1,
                    parity=serial.PARITY_NONE,
                    timeout=2,
                )
                self._connected = True
                self.socketio.emit("serial_status", {"connected": True})
                print(f"[SERIAL] [OK] Da ket noi thanh cong: {cfg['serial_port']}")
                print(f"[SERIAL] Dang lang nghe du lieu...\n")

                while self._running:
                    line = self._port.readline().decode("utf-8", errors="ignore").strip()
                    if line:
                        print(f"[SERIAL RAW] >>> {line}")
                        data = self._parse_line(line)
                        if data:
                            self._last_data = data
                            insert_reading(data)
                            self.socketio.emit("sensor_data", data)
                            print(f"[SERIAL OK]  T={data['temperature']}C  "
                                  f"H={data['humidity']}%  "
                                  f"P={data['pressure']}hPa  "
                                  f"PM1={data['pm1_0']}  "
                                  f"PM2.5={data['pm2_5']}  "
                                  f"PM10={data['pm10']}")
                        else:
                            print(f"[SERIAL WARN] Khong parse duoc dong tren")

            except serial.SerialException as e:
                self._connected = False
                self.socketio.emit("serial_status", {"connected": False})
                print(f"[SERIAL ERR] Loi Serial: {e}")
                if self._running:
                    print(f"[SERIAL] Thu lai sau 3 giay...")
                    time.sleep(3)
            except Exception as e:
                self._connected = False
                print(f"[SERIAL ERR] Loi khong xac dinh: {e}")
                if self._running:
                    time.sleep(3)
            finally:
                if self._port and self._port.is_open:
                    self._port.close()
                    print(f"[SERIAL] Da dong cong")

    @staticmethod
    def _parse_line(line):
        try:
            data = json.loads(line)
            required = ["temperature", "humidity", "pressure", "pm1_0", "pm2_5", "pm10"]
            if all(k in data for k in required):
                return {k: float(data[k]) for k in required}
        except (json.JSONDecodeError, ValueError, KeyError):
            pass

        try:
            parts = line.split(",")
            if len(parts) >= 6:
                keys = ["temperature", "humidity", "pressure", "pm1_0", "pm2_5", "pm10"]
                return {k: float(v.strip()) for k, v in zip(keys, parts[:6])}
        except (ValueError, IndexError):
            pass

        return None
