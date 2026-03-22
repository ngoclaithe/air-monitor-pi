import os
import sqlite3
from datetime import datetime, timedelta

from config import DB_PATH


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL,
            humidity REAL,
            pressure REAL,
            pm1_0 REAL,
            pm2_5 REAL,
            pm10 REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def insert_reading(data):
    conn = get_db()
    conn.execute(
        """INSERT INTO sensor_data (temperature, humidity, pressure, pm1_0, pm2_5, pm10)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            data.get("temperature"),
            data.get("humidity"),
            data.get("pressure"),
            data.get("pm1_0"),
            data.get("pm2_5"),
            data.get("pm10"),
        ),
    )
    conn.commit()
    conn.close()


def get_latest_reading():
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_readings(hours=24, limit=500):
    conn = get_db()
    since = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    rows = conn.execute(
        """SELECT * FROM sensor_data
           WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?""",
        (since, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_readings_range(start, end, limit=2000):
    conn = get_db()
    rows = conn.execute(
        """SELECT * FROM sensor_data
           WHERE created_at >= ? AND created_at <= ? ORDER BY created_at ASC LIMIT ?""",
        (start, end, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_stats(hours=24):
    conn = get_db()
    since = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    row = conn.execute(
        """SELECT
            COUNT(*) as total,
            AVG(temperature) as avg_temp, MIN(temperature) as min_temp, MAX(temperature) as max_temp,
            AVG(humidity) as avg_hum, MIN(humidity) as min_hum, MAX(humidity) as max_hum,
            AVG(pressure) as avg_pres, MIN(pressure) as min_pres, MAX(pressure) as max_pres,
            AVG(pm1_0) as avg_pm1, MIN(pm1_0) as min_pm1, MAX(pm1_0) as max_pm1,
            AVG(pm2_5) as avg_pm25, MIN(pm2_5) as min_pm25, MAX(pm2_5) as max_pm25,
            AVG(pm10) as avg_pm10, MIN(pm10) as min_pm10, MAX(pm10) as max_pm10
           FROM sensor_data WHERE created_at >= ?""",
        (since,),
    ).fetchone()
    conn.close()
    return dict(row) if row else {}


def clear_old_data(days=30):
    conn = get_db()
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    result = conn.execute("DELETE FROM sensor_data WHERE created_at < ?", (cutoff,))
    deleted = result.rowcount
    conn.commit()
    conn.close()
    return deleted
