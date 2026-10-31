// orders.js - Adaptive AI Order Management Module
// Priority is calculated by backend LST algorithm; customers choose delivery window only.
window.Orders = (function() {
    let activeOrders = [];

    async function init() {
        await loadMenu();
        await loadActiveOrders();

        const form = document.getElementById('order-form');
        if (form) {
            form.addEventListener('submit', submitOrder);
        }
    }

    async function loadMenu() {
        const res = await window.App.fetchAPI('/api/menu');
        let menu = (res && res.data) ? res.data : res;

        if (!menu || !Array.isArray(menu) || menu.length === 0) {
            menu = [
                { id: 1, name: 'Double Bacon Smash Burger', price: 220, category: 'Burger', station_type: 'Grill', preparation_time: 9 },
                { id: 2, name: 'Spicy Paneer Tikka Burger', price: 200, category: 'Burger', station_type: 'Grill', preparation_time: 8 },
                { id: 3, name: 'Classic Chicken Burger', price: 180, category: 'Burger', station_type: 'Grill', preparation_time: 7 },
                { id: 4, name: 'Truffle Parmesan Fries', price: 130, category: 'Sides', station_type: 'Fryer', preparation_time: 5 },
                { id: 5, name: 'Spicy Chicken Wings (6 pcs)', price: 240, category: 'Sides', station_type: 'Fryer', preparation_time: 11 },
                { id: 6, name: 'Farmhouse Veggie Pizza', price: 340, category: 'Pizza', station_type: 'Oven', preparation_time: 14 },
                { id: 7, name: 'Classic Pepperoni Pizza', price: 360, category: 'Pizza', station_type: 'Oven', preparation_time: 15 },
                { id: 8, name: 'Garden Fresh Caesar Salad', price: 180, category: 'Salad', station_type: 'Salad_Bar', preparation_time: 4 },
                { id: 9, name: 'Mango Iced Tea', price: 90, category: 'Beverage', station_type: 'Beverage', preparation_time: 2 },
                { id: 10, name: 'Belgian Chocolate Milkshake', price: 160, category: 'Beverage', station_type: 'Beverage', preparation_time: 4 }
            ];
        }

        const container = document.getElementById('menu-items-container');
        if (!container) return;

        container.innerHTML = menu.map(m => `
            <div class="menu-item-card">
                <div class="menu-item-info">
                    <span class="menu-item-name">${m.name || m.menu_item_name}</span>
                    <span class="menu-item-meta">₹${m.price} · ${m.preparation_time || m.base_prep_time_minutes || 5} min · ${m.station_type || 'Assembly'}</span>
                </div>
                <div class="menu-item-action">
                    <input type="number" min="0" max="20" value="0"
                        data-id="${m.id}"
                        data-name="${m.name || m.menu_item_name}"
                        data-category="${m.category || 'Burger'}"
                        data-station="${m.station_type || 'Grill'}"
                        data-prep="${m.preparation_time || 8}"
                        data-price="${m.price || 150}"
                        class="menu-qty">
                </div>
            </div>
        `).join('');
    }

    async function submitOrder(e) {
        e.preventDefault();
        const nameInput = document.getElementById('customer-name');
        const windowSelect = document.getElementById('delivery-window');

        const customerName = nameInput ? nameInput.value.trim() : 'Customer';
        const deliveryMinutes = windowSelect ? parseInt(windowSelect.value) : 35;

        const qtyInputs = document.querySelectorAll('.menu-qty');
        const items = [];

        qtyInputs.forEach(input => {
            const qty = parseInt(input.value);
            if (qty > 0) {
                items.push({
                    menu_item_id: parseInt(input.dataset.id),
                    id: parseInt(input.dataset.id),
                    name: input.dataset.name,
                    category: input.dataset.category,
                    station_type: input.dataset.station,
                    preparation_time: parseFloat(input.dataset.prep),
                    quantity: qty,
                    qty: qty
                });
            }
        });

        if (items.length === 0) {
            window.App.showToast('Please select at least 1 menu item.', 'warning');
            return;
        }

        // Disable button during submission
        const btn = document.getElementById('order-submit-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳ AI Routing Order...</span>'; }

        const payload = {
            customer_name: customerName,
            customerName: customerName,
            delivery_deadline_minutes: deliveryMinutes,
            deliveryMinutes: deliveryMinutes,
            items: items
        };

        const res = await window.App.fetchAPI('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (btn) { btn.disabled = false; btn.innerHTML = '<span>⚡ Dispatch Order to AI Scheduler</span>'; }

        if (res && (res.success || res.id || res.orderId || res.data)) {
            const orderData = res.data || res;
            const d = orderData;

            // Show AI result panel
            const panel = document.getElementById('priority-result-panel');
            if (panel && d) {
                const pClass = `p${d.priority || 3}`;
                const urgency = d.urgency_score || '--';
                const kitchenName = d.kitchen_name || d.kitchen_decision?.selected_kitchen_name || 'Central Kitchen';
                const rationale = d.priority_rationale || d.kitchen_decision?.rationale || 'Priority calculated by Least Slack Time algorithm.';
                panel.style.display = 'block';
                panel.innerHTML = `
                    <div class="ai-result-header">✅ AI Routing Decision</div>
                    <div class="ai-result-row">
                        <span>🏭 Assigned Kitchen:</span>
                        <strong>${kitchenName}</strong>
                    </div>
                    <div class="ai-result-row">
                        <span>⚡ Auto Priority:</span>
                        <span class="priority-badge ${pClass}">P${d.priority || 3}</span>
                        <span class="urgency-chip">Urgency ${urgency}/100</span>
                    </div>
                    <div class="ai-result-rationale">${rationale}</div>
                `;
                setTimeout(() => { panel.style.display = 'none'; }, 8000);
            }

            window.App.showToast(`✨ Order #${d.id || d.orderId} → ${kitchenName || 'Kitchen'} | Priority P${d.priority}`, 'success');
            addOrder(orderData);

            qtyInputs.forEach(i => i.value = '0');
            if (nameInput) nameInput.value = '';

            if (window.Dashboard && typeof window.Dashboard.refresh === 'function') {
                window.Dashboard.refresh();
            }
            if (window.Kitchens && typeof window.Kitchens.refresh === 'function') {
                window.Kitchens.refresh();
            }
        } else {
            window.App.showToast('Could not place order. Please check inputs or server connection.', 'danger');
        }
    }

    async function loadActiveOrders() {
        const res = await window.App.fetchAPI('/api/orders');
        const fetched = (res && res.data) ? res.data : res;
        if (fetched && Array.isArray(fetched)) {
            activeOrders = fetched;
        } else if (!activeOrders.length) {
            activeOrders = [
                {
                    id: 101,
                    customer_name: 'Aditi Sharma',
                    kitchen_name: 'Central Kitchen - Downtown Hub',
                    priority: 1,
                    urgency_score: 92,
                    priority_rationale: 'P1 Critical: Slack = -5m. Immediate dispatch required.',
                    status: 'Preparing',
                    total_amount: 490,
                    items: [
                        { name: 'Double Bacon Smash Burger', quantity: 2, status: 'Preparing', station_name: 'Grill Station A' },
                        { name: 'Truffle Parmesan Fries', quantity: 1, status: 'Ready', station_name: 'Deep Fryer' }
                    ]
                },
                {
                    id: 102,
                    customer_name: 'Rahul Varma',
                    kitchen_name: 'Express Kitchen - Tech Park',
                    priority: 2,
                    urgency_score: 74,
                    priority_rationale: 'P2 High: 4m slack remaining after 25m predicted prep.',
                    status: 'Queued',
                    total_amount: 620,
                    items: [
                        { name: 'Farmhouse Veggie Pizza', quantity: 1, status: 'Queued', station_name: 'Pizza Oven' }
                    ]
                }
            ];
        }
        renderOrders();
    }

    function addOrder(order) {
        const normalized = {
            id: order.id || order.orderId || Math.floor(Math.random() * 9000 + 1000),
            customer_name: order.customer_name || order.customerName || 'Customer',
            kitchen_name: order.kitchen_name || order.kitchen_decision?.selected_kitchen_name || 'Central Kitchen',
            priority: order.priority || 3,
            urgency_score: order.urgency_score || null,
            priority_rationale: order.priority_rationale || null,
            status: order.status || 'Queued',
            total_amount: order.totalAmount || order.total_amount || 250,
            items: order.items || []
        };

        activeOrders.unshift(normalized);
        renderOrders();
    }

    function updateOrder(updated) {
        const idx = activeOrders.findIndex(o => o.id === updated.id || o.id === updated.orderId);
        if (idx !== -1) {
            activeOrders[idx] = { ...activeOrders[idx], ...updated };
            if (updated.status === 'Delivered' || updated.status === 'Cancelled') {
                activeOrders.splice(idx, 1);
            }
            renderOrders();
        }
    }

    function renderOrders() {
        const container = document.getElementById('active-orders-list');
        if (!container) return;

        if (activeOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>📦</span>
                    <p>No active orders in queue. Place an order above!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activeOrders.map(order => {
            const pClass = `p${order.priority || 3}`;
            const statusLower = (order.status || 'queued').toLowerCase();
            const itemsList = order.items && order.items.length
                ? order.items.map(i => `• ${i.name || i.menu_item_name || 'Item'} ×${i.quantity || 1}`).join('<br>')
                : 'Standard Menu Selection';

            const kitchenBadge = order.kitchen_name
                ? `<span class="kitchen-badge">🏭 ${order.kitchen_name}</span>`
                : '';
            const urgencyChip = order.urgency_score
                ? `<span class="urgency-chip">⚡ Urgency ${order.urgency_score}/100</span>`
                : '';
            const rationaleRow = order.priority_rationale
                ? `<div class="priority-rationale-small">${order.priority_rationale}</div>`
                : '';

            return `
                <div class="order-card slide-up">
                    <div class="order-header">
                        <div class="order-title">
                            <strong>#${order.id}</strong>
                            <span class="customer-name">${order.customer_name || 'Customer'}</span>
                        </div>
                        <div class="order-meta-badges">
                            <span class="priority-badge ${pClass}">P${order.priority || 3}</span>
                            ${urgencyChip}
                            <span class="status-pill status-${statusLower}">${order.status || 'Queued'}</span>
                        </div>
                    </div>
                    <div class="order-body">
                        ${kitchenBadge}
                        <div class="order-items-summary">${itemsList}</div>
                        ${rationaleRow}
                        <div class="order-total">Total: ₹${order.total_amount || order.totalAmount || 0}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    return { init, addOrder, updateOrder, renderOrders };
})();
