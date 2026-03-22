let histEnvChart, histPmChart;

function initHistoryCharts() {
    const envCtx = document.getElementById("history-chart-env");
    const pmCtx = document.getElementById("history-chart-pm");

    const baseOpts = {
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
            x: { ticks: { color: "#94a3b8", maxTicksLimit: 10, font: { size: 11 } }, grid: { color: "rgba(226,232,240,0.6)" } },
            y: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "rgba(226,232,240,0.6)" } },
        },
        elements: { point: { radius: 0, hoverRadius: 5 }, line: { borderWidth: 2.5, tension: 0.35 } },
    };

    histEnvChart = new Chart(envCtx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                { label: "Nhiệt độ (°C)", data: [], borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", fill: true },
                { label: "Độ ẩm (%)", data: [], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", fill: true },
                { label: "Áp suất (hPa)", data: [], borderColor: "#8b5cf6", backgroundColor: "rgba(139,92,246,0.1)", fill: true, hidden: true },
            ],
        },
        options: baseOpts,
    });

    histPmChart = new Chart(pmCtx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                { label: "PM1.0", data: [], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", fill: true },
                { label: "PM2.5", data: [], borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)", fill: true },
                { label: "PM10", data: [], borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)", fill: true },
            ],
        },
        options: baseOpts,
    });
}

function setDefaultDates() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    document.getElementById("filter-start").value = fmt(yesterday);
    document.getElementById("filter-end").value = fmt(now);
}

function renderTable(rows) {
    const body = document.getElementById("data-body");
    const count = document.getElementById("result-count");
    count.textContent = rows.length + " bản ghi";

    body.innerHTML = rows
        .map(
            (r) => `<tr>
            <td>${new Date(r.created_at + "Z").toLocaleString("vi-VN")}</td>
            <td>${r.temperature != null ? r.temperature.toFixed(1) : "--"}</td>
            <td>${r.humidity != null ? r.humidity.toFixed(1) : "--"}</td>
            <td>${r.pressure != null ? r.pressure.toFixed(1) : "--"}</td>
            <td>${r.pm1_0 != null ? r.pm1_0.toFixed(1) : "--"}</td>
            <td>${r.pm2_5 != null ? r.pm2_5.toFixed(1) : "--"}</td>
            <td>${r.pm10 != null ? r.pm10.toFixed(1) : "--"}</td>
        </tr>`
        )
        .join("");
}

function renderCharts(rows) {
    const labels = rows.map((r) => {
        const d = new Date(r.created_at + "Z");
        return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    });

    histEnvChart.data.labels = labels;
    histEnvChart.data.datasets[0].data = rows.map((r) => r.temperature);
    histEnvChart.data.datasets[1].data = rows.map((r) => r.humidity);
    histEnvChart.data.datasets[2].data = rows.map((r) => r.pressure);
    histEnvChart.update("none");

    histPmChart.data.labels = labels;
    histPmChart.data.datasets[0].data = rows.map((r) => r.pm1_0);
    histPmChart.data.datasets[1].data = rows.map((r) => r.pm2_5);
    histPmChart.data.datasets[2].data = rows.map((r) => r.pm10);
    histPmChart.update("none");
}

async function loadHistory() {
    const start = document.getElementById("filter-start").value;
    const end = document.getElementById("filter-end").value;
    if (!start || !end) return;

    const startUTC = new Date(start).toISOString().replace("T", " ").slice(0, 19);
    const endUTC = new Date(end).toISOString().replace("T", " ").slice(0, 19);

    const res = await apiFetch(`/api/readings/range?start=${encodeURIComponent(startUTC)}&end=${encodeURIComponent(endUTC)}`);
    if (res.ok && res.data) {
        renderTable(res.data.slice().reverse());
        renderCharts(res.data);
    }
}

function exportCSV() {
    const table = document.getElementById("data-table");
    if (!table) return;
    const rows = table.querySelectorAll("tr");
    let csv = "";
    rows.forEach((row) => {
        const cols = row.querySelectorAll("th, td");
        csv += Array.from(cols).map((c) => '"' + c.textContent.trim() + '"').join(",") + "\n";
    });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "air_monitor_data.csv";
    a.click();
    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
    initHistoryCharts();
    setDefaultDates();
    loadHistory();

    document.getElementById("btn-filter").addEventListener("click", loadHistory);
    document.getElementById("btn-export").addEventListener("click", exportCSV);
});
