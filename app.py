from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO

from config import load_config, save_config
from models import (
    init_db,
    get_latest_reading,
    get_readings,
    get_readings_range,
    get_stats,
    clear_old_data,
)
from serial_reader import SerialReader

app = Flask(__name__)
app.config["SECRET_KEY"] = "air-monitor-secret-key"
socketio = SocketIO(app, async_mode="eventlet", cors_allowed_origins="*")
reader = SerialReader(socketio)

init_db()

cfg = load_config()
if cfg.get("auto_connect"):
    reader.start()


@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/history")
def history():
    return render_template("history.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


@app.route("/api/latest")
def api_latest():
    data = reader.last_data or get_latest_reading()
    return jsonify({"ok": True, "data": data})


@app.route("/api/readings")
def api_readings():
    hours = request.args.get("hours", 24, type=int)
    limit = request.args.get("limit", 500, type=int)
    rows = get_readings(hours=hours, limit=limit)
    return jsonify({"ok": True, "data": rows})


@app.route("/api/readings/range")
def api_readings_range():
    start = request.args.get("start", "")
    end = request.args.get("end", "")
    if not start or not end:
        return jsonify({"ok": False, "error": "start and end required"}), 400
    rows = get_readings_range(start, end)
    return jsonify({"ok": True, "data": rows})


@app.route("/api/stats")
def api_stats():
    hours = request.args.get("hours", 24, type=int)
    data = get_stats(hours=hours)
    return jsonify({"ok": True, "data": data})


@app.route("/api/config", methods=["GET"])
def api_get_config():
    return jsonify({"ok": True, "data": load_config()})


@app.route("/api/config", methods=["POST"])
def api_save_config():
    data = request.get_json()
    cfg = load_config()
    cfg.update(data)
    save_config(cfg)
    return jsonify({"ok": True, "data": cfg})


@app.route("/api/serial/ports")
def api_serial_ports():
    ports = SerialReader.list_ports()
    return jsonify({"ok": True, "data": ports})


@app.route("/api/serial/start", methods=["POST"])
def api_serial_start():
    ok = reader.start()
    return jsonify({"ok": ok, "connected": reader.connected})


@app.route("/api/serial/stop", methods=["POST"])
def api_serial_stop():
    ok = reader.stop()
    return jsonify({"ok": ok, "connected": reader.connected})


@app.route("/api/serial/status")
def api_serial_status():
    return jsonify({"ok": True, "connected": reader.connected})


@app.route("/api/data/clear", methods=["POST"])
def api_clear_data():
    days = request.get_json().get("days", 30) if request.is_json else 30
    deleted = clear_old_data(days=days)
    return jsonify({"ok": True, "deleted": deleted})


@socketio.on("connect")
def on_connect():
    socketio.emit("serial_status", {"connected": reader.connected})
    data = reader.last_data or get_latest_reading()
    if data:
        socketio.emit("sensor_data", data)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8000, debug=True)
