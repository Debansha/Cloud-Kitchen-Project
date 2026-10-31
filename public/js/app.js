// app.js - Client Socket.IO Connection & Application Orchestrator
window.App = (function() {
    let socket;

    async function fetchAPI(endpoint, options = {}) {
        try {
            const res = await fetch(endpoint, options);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const json = await res.json();
            return json;
        } catch (err) {
            console.warn('API Fetch Notice:', err.message);
            return null;
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'warning') icon = '⚠️';
        if (type === 'danger' || type === 'error') icon = '❌';

        toast.innerHTML = `<strong>${icon}</strong> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 3500);
    }

    function initSocket() {
        if (typeof io === 'undefined') return;
        socket = io();

        const connDot = document.getElementById('conn-dot');
        const connText = document.getElementById('conn-text');

        socket.on('connect', () => {
            if (connDot) connDot.className = 'dot online pulse';
            if (connText) connText.innerText = 'Live Real-Time';
        });

        socket.on('disconnect', () => {
            if (connDot) connDot.className = 'dot offline';
            if (connText) connText.innerText = 'Offline';
        });

        socket.on('new-order', (order) => {
            if (window.Orders) window.Orders.addOrder(order);
            if (window.Dashboard) window.Dashboard.refresh();
            showToast(`New Order #${order.id || order.orderId} dispatched!`, 'success');
        });

        socket.on('order-updated', (order) => {
            if (window.Orders) window.Orders.updateOrder(order);
            if (window.Dashboard) window.Dashboard.refresh();
        });

        socket.on('scheduling-update', (data) => {
            if (window.Gantt) window.Gantt.update(data);
            if (window.Charts) window.Charts.update(data.comparison);
            if (window.Dashboard) window.Dashboard.refresh();
        });

        socket.on('station-updated', (stations) => {
            if (window.Dashboard) window.Dashboard.refreshStations(stations);
        });

        socket.on('inventory-updated', (inventory) => {
            if (window.Dashboard) window.Dashboard.refreshInventory(inventory);
        });
    }

    function startClock() {
        const clockEl = document.getElementById('live-clock');
        if (!clockEl) return;
        setInterval(() => {
            const now = new Date();
            clockEl.innerText = now.toLocaleTimeString();
        }, 1000);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSocket();
        startClock();

        if (window.Dashboard) window.Dashboard.init();
        if (window.Orders) window.Orders.init();
        if (window.Gantt) window.Gantt.init('gantt-canvas');
        if (window.Charts) window.Charts.init();
    });

    return {
        fetchAPI,
        showToast
    };
})();
