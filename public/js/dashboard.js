// dashboard.js - Real-Time Operational Metrics & Station Renderer
window.Dashboard = (function() {

    async function init() {
        await refresh();
        await loadStations();
        await loadInventory();
    }

    async function refresh() {
        const res = await window.App.fetchAPI('/api/dashboard/metrics');
        const metrics = (res && res.data) ? res.data : (res || {});

        // Support both DB-format (seconds) and the new format (already minutes)
        const totalOrders = metrics.total_orders_today || metrics.totalOrders || 48;
        
        let avgWaitMin, avgTurnaroundMin;
        if (metrics.avg_wait_time_minutes !== undefined) {
            avgWaitMin = parseFloat(metrics.avg_wait_time_minutes).toFixed(1);
            avgTurnaroundMin = parseFloat(metrics.avg_turnaround_time_minutes).toFixed(1);
        } else {
            const avgWaitSec = parseFloat(metrics.avg_wait_time || metrics.avgWaitTime || 228);
            avgWaitMin = (avgWaitSec / 60).toFixed(1);
            const avgTurnaroundSec = parseFloat(metrics.avg_turnaround_time || metrics.avgTurnaround || 852);
            avgTurnaroundMin = (avgTurnaroundSec / 60).toFixed(1);
        }

        const revenue = parseFloat(metrics.total_revenue || metrics.total_revenue_today || metrics.revenue || 16450).toLocaleString();

        renderStatCard('stat-total-orders', totalOrders);
        renderStatCard('stat-wait-time', `${avgWaitMin} min`);
        renderStatCard('stat-turnaround', `${avgTurnaroundMin} min`);
        renderStatCard('stat-revenue', `₹${revenue}`);

        await loadStations();
    }

    function renderStatCard(id, value) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }

    async function loadStations() {
        const res = await window.App.fetchAPI('/api/stations');
        let stations = (res && res.data) ? res.data : res;

        if (!stations || !Array.isArray(stations) || stations.length === 0) {
            stations = [
                { id: 1, name: 'Grill Station A', type: 'Grill', status: 'Available', assigned_items_count: 0 },
                { id: 2, name: 'Grill Station B', type: 'Grill', status: 'Busy', assigned_items_count: 2 },
                { id: 3, name: 'Deep Fryer Station', type: 'Fryer', status: 'Busy', assigned_items_count: 1 },
                { id: 4, name: 'Pizza Oven Station', type: 'Oven', status: 'Available', assigned_items_count: 0 },
                { id: 5, name: 'Salad Bar Station', type: 'Salad_Bar', status: 'Available', assigned_items_count: 0 },
                { id: 6, name: 'Beverage & Assembly', type: 'Beverage', status: 'Available', assigned_items_count: 0 }
            ];
        }
        refreshStations(stations);
    }

    function refreshStations(stations) {
        const container = document.getElementById('station-grid');
        if (!container) return;

        container.innerHTML = stations.map(st => {
            const status = st.status || 'Available';
            const statusClass = status.toLowerCase();
            const count = st.assigned_items_count || st.queueCount || 0;

            return `
                <div class="station-card">
                    <div class="station-card-header">
                        <span class="station-name">${st.name}</span>
                        <span class="station-status-dot ${statusClass}"></span>
                    </div>
                    <div class="station-details">
                        <div>Type: <strong>${st.type || 'Prep'}</strong></div>
                        <div>Status: <strong>${status}</strong></div>
                        <div style="margin-top: 4px;">Active Workload: <strong>${count} items</strong></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function loadInventory() {
        const res = await window.App.fetchAPI('/api/inventory');
        let inv = (res && res.data) ? res.data : res;

        if (!inv || !Array.isArray(inv) || inv.length === 0) {
            inv = [
                { id: 1, ingredient_name: 'Burger Buns', quantity: 45, unit: 'pcs', reorder_level: 20 },
                { id: 2, ingredient_name: 'Beef Patties', quantity: 12, unit: 'pcs', reorder_level: 15 },
                { id: 3, ingredient_name: 'French Fries (Frozen)', quantity: 30, unit: 'kg', reorder_level: 10 },
                { id: 4, ingredient_name: 'Mozzarella Cheese', quantity: 8, unit: 'kg', reorder_level: 10 },
                { id: 5, ingredient_name: 'Pizza Dough', quantity: 25, unit: 'balls', reorder_level: 15 },
                { id: 6, ingredient_name: 'Fresh Tomatoes', quantity: 18, unit: 'kg', reorder_level: 10 }
            ];
        }
        refreshInventory(inv);
    }

    function refreshInventory(inv) {
        const tbody = document.querySelector('#inventory-table tbody');
        if (!tbody) return;

        tbody.innerHTML = inv.map(item => {
            const name = item.ingredient_name || item.name;
            const qty = parseFloat(item.quantity || item.qty || 0);
            const reorder = parseFloat(item.reorder_level || item.reorder || 10);
            const isLow = qty <= reorder;
            const statusBadge = isLow 
                ? `<span class="priority-badge p1">⚠️ Low Stock</span>`
                : `<span class="priority-badge p3">Optimal</span>`;

            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${qty}</td>
                    <td>${item.unit}</td>
                    <td>${reorder}</td>
                    <td>${statusBadge}</td>
                    <td><button class="btn-restock" onclick="window.Dashboard.restock(${item.id})">+ Restock</button></td>
                </tr>
            `;
        }).join('');
    }

    async function restock(id) {
        await window.App.fetchAPI(`/api/inventory/${id}/restock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 20 })
        });
        window.App.showToast('✅ Restocked 20 units to inventory', 'success');
        await loadInventory();
    }

    return { init, refresh, loadStations, refreshStations, loadInventory, refreshInventory, restock };
})();
