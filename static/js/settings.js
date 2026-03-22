async function loadPorts() {
    const select = document.getElementById("cfg-port");
    const res = await apiFetch("/api/serial/ports");
    if (!res.ok) return;

    select.innerHTML = "";
    if (res.data.length === 0) {
        select.innerHTML = '<option value="">Không tìm thấy cổng</option>';
        return;
    }
    res.data.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.device;
        opt.textContent = `${p.device} — ${p.description}`;
        select.appendChild(opt);
    });
}

async function loadConfig() {
    const res = await apiFetch("/api/config");
    if (!res.ok) return;
    const cfg = res.data;

    const portSelect = document.getElementById("cfg-port");
    if (portSelect) {
        for (const opt of portSelect.options) {
            if (opt.value === cfg.serial_port) {
                opt.selected = true;
                break;
            }
        }
    }

    document.getElementById("cfg-baud").value = cfg.baud_rate;
    document.getElementById("cfg-interval").value = cfg.read_interval;
    document.getElementById("cfg-autoconnect").checked = cfg.auto_connect;
}

async function saveConfig() {
    const cfg = {
        serial_port: document.getElementById("cfg-port").value,
        baud_rate: parseInt(document.getElementById("cfg-baud").value),
        read_interval: parseInt(document.getElementById("cfg-interval").value),
        auto_connect: document.getElementById("cfg-autoconnect").checked,
    };
    const res = await apiFetch("/api/config", { method: "POST", body: JSON.stringify(cfg) });
    if (res.ok) {
        showToast("Đã lưu cấu hình thành công");
    } else {
        showToast("Lỗi khi lưu cấu hình", "error");
    }
}

async function connectSerial() {
    const res = await apiFetch("/api/serial/start", { method: "POST" });
    if (res.ok) {
        showToast("Đang kết nối serial...");
    } else {
        showToast("Không thể kết nối", "error");
    }
}

async function disconnectSerial() {
    const res = await apiFetch("/api/serial/stop", { method: "POST" });
    if (res.ok) {
        showToast("Đã ngắt kết nối");
    } else {
        showToast("Lỗi ngắt kết nối", "error");
    }
}

async function cleanData() {
    const days = parseInt(document.getElementById("cfg-clean-days").value) || 30;
    if (!confirm(`Xóa tất cả dữ liệu cũ hơn ${days} ngày?`)) return;

    const res = await apiFetch("/api/data/clear", {
        method: "POST",
        body: JSON.stringify({ days }),
    });
    if (res.ok) {
        showToast(`Đã xóa ${res.deleted} bản ghi cũ`);
    } else {
        showToast("Lỗi khi xóa dữ liệu", "error");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadPorts();
    await loadConfig();

    document.getElementById("btn-refresh-ports").addEventListener("click", loadPorts);
    document.getElementById("btn-save-config").addEventListener("click", saveConfig);
    document.getElementById("btn-connect").addEventListener("click", connectSerial);
    document.getElementById("btn-disconnect").addEventListener("click", disconnectSerial);
    document.getElementById("btn-clean-data").addEventListener("click", cleanData);
});
