// charts.js
window.Charts = (function() {
    let waitChart, turnaroundChart, throughputChart;

    function init() {
        Chart.defaults.color = '#8888aa';
        Chart.defaults.font.family = 'Inter';

        createWaitChart();
        createTurnaroundChart();
        createThroughputChart();
    }

    function createWaitChart() {
        const ctx = document.getElementById('comparison-wait-chart');
        if(!ctx) return;
        waitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['FCFS', 'SJF', 'Priority'],
                datasets: [{
                    label: 'Avg Wait Time (min)',
                    data: [15, 10, 8],
                    backgroundColor: ['#ef476f', '#00f5d4', '#f72585'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function createTurnaroundChart() {
        const ctx = document.getElementById('comparison-turnaround-chart');
        if(!ctx) return;
        turnaroundChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['FCFS', 'SJF', 'Priority'],
                datasets: [{
                    label: 'Avg Turnaround (min)',
                    data: [25, 18, 15],
                    backgroundColor: ['#ef476f', '#00f5d4', '#f72585'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function createThroughputChart() {
        const ctx = document.getElementById('throughput-chart');
        if(!ctx) return;
        throughputChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['10:00', '11:00', '12:00', '13:00', '14:00'],
                datasets: [
                    { label: 'FCFS', data: [5, 10, 15, 20, 25], borderColor: '#ef476f', tension: 0.4 },
                    { label: 'SJF', data: [7, 14, 22, 28, 35], borderColor: '#00f5d4', tension: 0.4 },
                    { label: 'Priority', data: [6, 15, 25, 32, 40], borderColor: '#f72585', tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            }
        });
    }

    function update(data) {
        if(!data) return;
        if(waitChart) {
            waitChart.data.datasets[0].data = [data.fcfs?.avgWait||0, data.sjf?.avgWait||0, data.priority?.avgWait||0];
            waitChart.update();
        }
        if(turnaroundChart) {
            turnaroundChart.data.datasets[0].data = [data.fcfs?.avgTurnaround||0, data.sjf?.avgTurnaround||0, data.priority?.avgTurnaround||0];
            turnaroundChart.update();
        }
    }

    return { init, update };
})();
