const CHART_COLORS = {
    temperature: { border: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    humidity: { border: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    pressure: { border: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
    pm1_0: { border: "#10b981", bg: "rgba(16,185,129,0.1)" },
    pm2_5: { border: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    pm10: { border: "#ec4899", bg: "rgba(236,72,153,0.1)" },
};

const LIMITS = {
    temperature: { min: -10, max: 50 },
    humidity: { min: 0, max: 100 },
    pressure: { min: 900, max: 1100 },
    pm1_0: { min: 0, max: 150 },
    pm2_5: { min: 0, max: 250 },
    pm10: { min: 0, max: 350 },
};

let envChart, pmChart;
let currentHours = 1;

function getAQI(pm25) {
    if (pm25 <= 12) return { label: "Tốt", cls: "" };
    if (pm25 <= 35.4) return { label: "Trung bình", cls: "moderate" };
    if (pm25 <= 55.4) return { label: "Nhạy cảm", cls: "unhealthy-sg" };
    if (pm25 <= 150.4) return { label: "Kém", cls: "unhealthy" };
    if (pm25 <= 250.4) return { label: "Xấu", cls: "very-unhealthy" };
    return { label: "Nguy hiểm", cls: "hazardous" };
}

function barPercent(val, key) {
    const lim = LIMITS[key];
    return Math.min(100, Math.max(0, ((val - lim.min) / (lim.max - lim.min)) * 100));
}

function updateMetrics(data) {
    const fields = {
        temperature: "val-temperature",
        humidity: "val-humidity",
        pressure: "val-pressure",
        pm1_0: "val-pm1",
        pm2_5: "val-pm25",
        pm10: "val-pm10",
    };
    const bars = {
        temperature: "bar-temperature",
        humidity: "bar-humidity",
        pressure: "bar-pressure",
        pm1_0: "bar-pm1",
        pm2_5: "bar-pm25",
        pm10: "bar-pm10",
    };

    for (const [key, id] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el && data[key] != null) {
            el.textContent = Number(data[key]).toFixed(1);
        }
    }

    for (const [key, id] of Object.entries(bars)) {
        const el = document.getElementById(id);
        if (el && data[key] != null) {
            el.style.width = barPercent(data[key], key) + "%";
        }
    }

    if (data.pm2_5 != null) {
        const aqiBadge = document.getElementById("aqi-badge");
        const aqi = getAQI(data.pm2_5);
        if (aqiBadge) {
            aqiBadge.textContent = aqi.label;
            aqiBadge.className = "aqi-badge " + aqi.cls;
        }
    }
}

function chartOptions(unit) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: {
                labels: { color: "#64748b", padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12, weight: 500 } },
            },
            tooltip: {
                backgroundColor: "rgba(255,255,255,0.96)",
                titleColor: "#1e293b",
                bodyColor: "#64748b",
                borderColor: "#e2e8f0",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                boxPadding: 4,
            },
        },
        scales: {
            x: {
                ticks: { color: "#94a3b8", maxTicksLimit: 8, font: { size: 11 } },
                grid: { color: "rgba(226,232,240,0.6)" },
            },
            y: {
                ticks: { color: "#94a3b8", font: { size: 11 }, callback: (v) => v + (unit || "") },
                grid: { color: "rgba(226,232,240,0.6)" },
            },
        },
        elements: {
            point: { radius: 0, hoverRadius: 5 },
            line: { borderWidth: 2.5, tension: 0.35 },
        },
    };
}

function makeDataset(label, data, colorKey) {
    const c = CHART_COLORS[colorKey];
    return {
        label,
        data,
        borderColor: c.border,
        backgroundColor: c.bg,
        fill: true,
    };
}

function initCharts() {
    const envCtx = document.getElementById("chart-env");
    const pmCtx = document.getElementById("chart-pm");

    envChart = new Chart(envCtx, {
        type: "line",
        data: { labels: [], datasets: [makeDataset("Nhiệt độ (°C)", [], "temperature"), makeDataset("Độ ẩm (%)", [], "humidity")] },
        options: chartOptions(),
    });

    pmChart = new Chart(pmCtx, {
        type: "line",
        data: { labels: [], datasets: [makeDataset("PM1.0", [], "pm1_0"), makeDataset("PM2.5", [], "pm2_5"), makeDataset("PM10", [], "pm10")] },
        options: chartOptions(" µg/m³"),
    });
}

function updateCharts(rows) {
    const labels = rows.map((r) => {
        const d = new Date(r.created_at + "Z");
        return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    });

    envChart.data.labels = labels;
    envChart.data.datasets[0].data = rows.map((r) => r.temperature);
    envChart.data.datasets[1].data = rows.map((r) => r.humidity);
    envChart.update("none");

    pmChart.data.labels = labels;
    pmChart.data.datasets[0].data = rows.map((r) => r.pm1_0);
    pmChart.data.datasets[1].data = rows.map((r) => r.pm2_5);
    pmChart.data.datasets[2].data = rows.map((r) => r.pm10);
    pmChart.update("none");
}

function updateStats(stats) {
    const body = document.getElementById("stats-body");
    if (!body) return;

    const metrics = [
        { name: "Nhiệt độ (°C)", avg: stats.avg_temp, min: stats.min_temp, max: stats.max_temp },
        { name: "Độ ẩm (%)", avg: stats.avg_hum, min: stats.min_hum, max: stats.max_hum },
        { name: "Áp suất (hPa)", avg: stats.avg_pres, min: stats.min_pres, max: stats.max_pres },
        { name: "PM1.0 (µg/m³)", avg: stats.avg_pm1, min: stats.min_pm1, max: stats.max_pm1 },
        { name: "PM2.5 (µg/m³)", avg: stats.avg_pm25, min: stats.min_pm25, max: stats.max_pm25 },
        { name: "PM10 (µg/m³)", avg: stats.avg_pm10, min: stats.min_pm10, max: stats.max_pm10 },
    ];

    body.innerHTML = metrics
        .map(
            (m) => `<tr>
            <td style="font-weight:600">${m.name}</td>
            <td>${m.avg != null ? m.avg.toFixed(1) : "--"}</td>
            <td>${m.min != null ? m.min.toFixed(1) : "--"}</td>
            <td>${m.max != null ? m.max.toFixed(1) : "--"}</td>
        </tr>`
        )
        .join("");
}

async function loadData() {
    const [latest, readings, stats] = await Promise.all([
        apiFetch("/api/latest"),
        apiFetch(`/api/readings?hours=${currentHours}&limit=300`),
        apiFetch("/api/stats?hours=24"),
    ]);

    if (latest.ok && latest.data) updateMetrics(latest.data);
    if (readings.ok && readings.data) updateCharts(readings.data.reverse());
    if (stats.ok && stats.data) updateStats(stats.data);
}

socket.on("sensor_data", (data) => {
    updateMetrics(data);

    if (envChart && envChart.data.labels.length > 0) {
        const now = new Date();
        const label = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

        envChart.data.labels.push(label);
        envChart.data.datasets[0].data.push(data.temperature);
        envChart.data.datasets[1].data.push(data.humidity);
        if (envChart.data.labels.length > 300) {
            envChart.data.labels.shift();
            envChart.data.datasets.forEach((ds) => ds.data.shift());
        }
        envChart.update("none");

        pmChart.data.labels.push(label);
        pmChart.data.datasets[0].data.push(data.pm1_0);
        pmChart.data.datasets[1].data.push(data.pm2_5);
        pmChart.data.datasets[2].data.push(data.pm10);
        if (pmChart.data.labels.length > 300) {
            pmChart.data.labels.shift();
            pmChart.data.datasets.forEach((ds) => ds.data.shift());
        }
        pmChart.update("none");
    }
});

document.querySelectorAll(".btn-chip[data-hours]").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-chip[data-hours]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentHours = parseInt(btn.dataset.hours);
        loadData();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    loadData();
});
