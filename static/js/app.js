const socket = io();

socket.on("serial_status", (data) => {
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    if (!dot || !text) return;

    if (data.connected) {
        dot.classList.add("connected");
        text.textContent = "Đã kết nối";
    } else {
        dot.classList.remove("connected");
        text.textContent = "Ngắt kết nối";
    }
});

function updateHeaderTime() {
    const el = document.getElementById("header-time");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

updateHeaderTime();
setInterval(updateHeaderTime, 1000);

/* ── Sidebar toggle (desktop + mobile) ── */
const SIDEBAR_KEY = "sidebar_collapsed";
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("sidebar-toggle-btn");
const collapseBtn = document.getElementById("sidebar-collapse-btn");
const overlay = document.getElementById("sidebar-overlay");
const mainContent = document.querySelector(".main-content");
const pageHeader = document.querySelector(".page-header");

function isMobile() {
    return window.innerWidth <= 768;
}

function applySidebarState(collapsed) {
    if (collapsed) {
        sidebar.classList.add("collapsed");
        document.body.classList.add("sidebar-collapsed");
    } else {
        sidebar.classList.remove("collapsed");
        document.body.classList.remove("sidebar-collapsed");
    }
}

// Restore saved state on desktop; mobile always starts collapsed
if (!isMobile()) {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    applySidebarState(saved === "true");
}

// Desktop collapse button inside sidebar header
if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
        const isCollapsed = sidebar.classList.toggle("collapsed");
        document.body.classList.toggle("sidebar-collapsed", isCollapsed);
        localStorage.setItem(SIDEBAR_KEY, isCollapsed);
    });
}

// Hamburger toggle button (visible when sidebar collapsed on desktop, or on mobile)
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        if (isMobile()) {
            sidebar.classList.toggle("open");
        } else {
            // On desktop, expand sidebar
            sidebar.classList.remove("collapsed");
            document.body.classList.remove("sidebar-collapsed");
            localStorage.setItem(SIDEBAR_KEY, "false");
        }
    });
}

// Close sidebar on mobile when clicking overlay
if (overlay) {
    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
    });
}

// Close mobile sidebar when clicking outside
document.addEventListener("click", (e) => {
    if (
        isMobile() &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        !toggleBtn.contains(e.target)
    ) {
        sidebar.classList.remove("open");
    }
});

// Handle resize: reset mobile open state when going to desktop
window.addEventListener("resize", () => {
    if (!isMobile()) {
        sidebar.classList.remove("open");
    }
});

function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "toast show " + type;
    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    return res.json();
}
