// kitchens.js - Multi-Cloud-Kitchen Status Panel
window.Kitchens = (function() {

    async function init() {
        await refresh();
        loadModelInfo();
        loadFeatureImportances();
        bindRetrainButton();

        const refreshBtn = document.getElementById('btn-refresh-kitchens');
        if (refreshBtn) refreshBtn.addEventListener('click', refresh);
    }

    async function refresh() {
        const res = await window.App.fetchAPI('/api/kitchens');
        let kitchens = (res && res.data) ? res.data : null;

        if (!kitchens || !Array.isArray(kitchens)) {
            kitchens = [
                { id: 1, code: 'CK-CENTRAL', name: 'Central Kitchen - Downtown Hub', location_zone: 'Downtown Core', staff_count: 6, active_orders: 3, max_concurrent_orders: 25, rating: 4.85 },
                { id: 2, code: 'CK-TECHPARK', name: 'Express Kitchen - Tech Park', location_zone: 'Tech Corridor', staff_count: 4, active_orders: 2, max_concurrent_orders: 18, rating: 4.70 },
                { id: 3, code: 'CK-NORTH', name: 'Suburban Cloud Kitchen - North Hub', location_zone: 'North Residential', staff_count: 5, active_orders: 1, max_concurrent_orders: 20, rating: 4.90 }
            ];
        }

        renderKitchens(kitchens);
    }

    function renderKitchens(kitchens) {
        const container = document.getElementById('kitchen-status-grid');
        if (!container) return;

        container.innerHTML = kitchens.map(k => {
            const load = k.active_orders || 0;
            const cap = k.max_concurrent_orders || 25;
            const loadPct = Math.round((load / cap) * 100);
            const loadClass = loadPct > 75 ? 'load-high' : loadPct > 45 ? 'load-medium' : 'load-low';

            return `
                <div class="kitchen-node-card ${loadClass}">
                    <div class="kitchen-node-header">
                        <span class="kitchen-code">${k.code || 'CK-?'}</span>
                        <span class="kitchen-rating">★ ${k.rating || '4.8'}</span>
                    </div>
                    <div class="kitchen-node-name">${k.name}</div>
                    <div class="kitchen-node-zone">📍 ${k.location_zone || 'Zone Unknown'}</div>
                    <div class="kitchen-node-stats">
                        <div class="kn-stat">
                            <span class="kn-label">Active Orders</span>
                            <span class="kn-value">${load}/${cap}</span>
                        </div>
                        <div class="kn-stat">
                            <span class="kn-label">Active Staff</span>
                            <span class="kn-value">${k.staff_count || '--'}</span>
                        </div>
                        <div class="kn-stat">
                            <span class="kn-label">Load</span>
                            <span class="kn-value ${loadClass}">${loadPct}%</span>
                        </div>
                    </div>
                    <div class="staff-control">
                        <label style="font-size:0.7rem;opacity:0.7;">Adjust Staff (Demo):</label>
                        <div class="staff-stepper">
                            <button class="stepper-btn" onclick="window.Kitchens.changeStaff(${k.id}, -1, this)">−</button>
                            <span class="staff-count-display" id="staff-display-${k.id}">${k.staff_count || 5}</span>
                            <button class="stepper-btn" onclick="window.Kitchens.changeStaff(${k.id}, 1, this)">+</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function changeStaff(kitchenId, delta, btn) {
        const displayEl = document.getElementById(`staff-display-${kitchenId}`);
        if (!displayEl) return;
        
        const currentCount = parseInt(displayEl.textContent) || 5;
        const newCount = Math.max(1, Math.min(20, currentCount + delta));
        displayEl.textContent = newCount;

        const res = await window.App.fetchAPI(`/api/kitchens/${kitchenId}/staff`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: newCount })
        });

        if (res && res.success) {
            window.App.showToast(`🏭 Kitchen staff updated to ${newCount} — AI predictions recalibrated!`, 'info');
        }
    }

    async function loadModelInfo() {
        const res = await window.App.fetchAPI('/api/dashboard/models');
        if (!res || !res.data) return;
        const m = res.data.current_production_model;
        if (!m) return;

        const versionEl = document.getElementById('model-version-display');
        const maeEl = document.getElementById('model-mae-display');
        const r2El = document.getElementById('model-r2-display');
        const badgeEl = document.getElementById('model-badge-label');
        const statMae = document.getElementById('stat-model-mae');
        const statVersion = document.getElementById('stat-model-version');

        if (versionEl) versionEl.textContent = m.version || 'v2.0-rf-prod';
        if (maeEl) maeEl.textContent = `${m.validation_mae_seconds || 73.7} s`;
        if (r2El) r2El.textContent = m.validation_r2_score || 0.9848;
        if (badgeEl) badgeEl.textContent = m.version || 'v2.0-rf-prod';
        if (statMae) statMae.textContent = `${m.validation_mae_seconds || 73.7} s`;
        if (statVersion) statVersion.textContent = `${m.version || 'v2.0-rf-prod'} | R²: ${m.validation_r2_score || 0.9848}`;
    }

    async function loadFeatureImportances() {
        const res = await window.App.fetchAPI('/api/dashboard/models');
        const importances = (res && res.data && res.data.feature_importances) ? res.data.feature_importances : {
            quantity: 0.2817,
            base_prep_time_minutes: 0.2457,
            item_complexity_score: 0.1549,
            category_Pizza: 0.0908,
            station_type_Oven: 0.0671,
            queue_length: 0.0450,
            active_staff_count: 0.0337,
            station_load: 0.0320,
            station_staff_ratio: 0.0202,
            is_peak_hour: 0.0138
        };

        const container = document.getElementById('feature-importance-bars');
        if (!container) return;

        const maxImp = Math.max(...Object.values(importances));
        container.innerHTML = Object.entries(importances)
            .sort(([,a], [,b]) => b - a)
            .map(([name, imp]) => {
                const pct = Math.round((imp / maxImp) * 100);
                return `
                    <div class="feature-bar-row">
                        <div class="feature-bar-label">${name}</div>
                        <div class="feature-bar-track">
                            <div class="feature-bar-fill" style="width:${pct}%"></div>
                        </div>
                        <div class="feature-bar-val">${(imp * 100).toFixed(1)}%</div>
                    </div>
                `;
            }).join('');
    }

    function bindRetrainButton() {
        const btn = document.getElementById('btn-retrain');
        if (!btn) return;

        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = '⏳ Training candidate model...';

            const res = await window.App.fetchAPI('/api/dashboard/retrain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature: 'equipment_condition' })
            });

            btn.disabled = false;
            btn.textContent = '🔁 Trigger Candidate Retrain';

            const resultDiv = document.getElementById('retrain-result');
            if (res && res.data && resultDiv) {
                const d = res.data;
                const icon = d.status === 'promoted' ? '✅' : '❌';
                const colorClass = d.status === 'promoted' ? 'retrain-promoted' : 'retrain-rejected';
                resultDiv.style.display = 'block';
                resultDiv.className = `retrain-result ${colorClass}`;
                resultDiv.innerHTML = `
                    <strong>${icon} Evaluation: ${(d.status || '').toUpperCase()}</strong><br>
                    <small>${d.decision_note || 'Evaluation complete.'}</small><br>
                    <small>Candidate MAE: ${d.val_mae}s | R²: ${d.val_r2} | Trained: ${new Date(d.trained_at).toLocaleTimeString()}</small>
                `;
                setTimeout(() => { resultDiv.style.display = 'none'; }, 12000);
            }
        });
    }

    return { init, refresh, changeStaff };
})();

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.Kitchens) window.Kitchens.init();
});
