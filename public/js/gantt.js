// gantt.js - Real-Time HTML5 Canvas Gantt Chart Generator
window.Gantt = (function() {
    let canvas, ctx;
    let fullGanttData = null;
    let currentAlgo = 'Priority';

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        
        const btnFcfs = document.getElementById('btn-gantt-fcfs');
        const btnSjf = document.getElementById('btn-gantt-sjf');
        const btnPriority = document.getElementById('btn-gantt-priority');

        if (btnFcfs) btnFcfs.addEventListener('click', () => setAlgorithm('FCFS'));
        if (btnSjf) btnSjf.addEventListener('click', () => setAlgorithm('SJF'));
        if (btnPriority) btnPriority.addEventListener('click', () => setAlgorithm('Priority'));
    }

    function resize() {
        if (!canvas || !canvas.parentElement) return;
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight || 280;
        render();
    }

    function setAlgorithm(type) {
        currentAlgo = type;
        
        ['fcfs', 'sjf', 'priority'].forEach(alg => {
            const btn = document.getElementById(`btn-gantt-${alg}`);
            if (btn) {
                if (alg.toLowerCase() === type.toLowerCase()) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });

        render();
    }

    function update(data) {
        if (data) {
            fullGanttData = data.ganttData || data;
            render();
        }
    }

    function render() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        
        // Draw Header
        ctx.fillStyle = '#9499c3';
        ctx.font = '600 12px Inter';
        ctx.fillText(`Mode: ${currentAlgo} CPU Schedule Execution`, 15, 20);

        // Stations
        const stations = [
            { id: 1, name: 'Grill Station A' },
            { id: 2, name: 'Grill Station B' },
            { id: 3, name: 'Deep Fryer' },
            { id: 4, name: 'Pizza Oven' },
            { id: 5, name: 'Salad Bar' },
            { id: 6, name: 'Assembly Line' }
        ];

        const leftMargin = 140;
        const topMargin = 40;
        const rowHeight = 35;
        const timelineWidth = width - leftMargin - 30;

        // Extract algorithm timeline items or mock fallback
        let items = [];
        if (fullGanttData && fullGanttData[currentAlgo]) {
            items = fullGanttData[currentAlgo];
        } else {
            // Default sample demo items
            items = [
                { stationName: 'Grill Station A', jobName: 'Cheeseburger', start: 0, end: 15, priority: 1 },
                { stationName: 'Deep Fryer', jobName: 'Crispy Fries', start: 5, end: 12, priority: 3 },
                { stationName: 'Pizza Oven', jobName: 'Pepperoni Pizza', start: 10, end: 30, priority: 2 },
                { stationName: 'Salad Bar', jobName: 'Caesar Salad', start: 2, end: 8, priority: 4 },
                { stationName: 'Assembly Line', jobName: 'Chocolate Shake', start: 0, end: 6, priority: 3 }
            ];
        }

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 6; i++) {
            const x = leftMargin + (timelineWidth / 6) * i;
            ctx.beginPath();
            ctx.moveTo(x, topMargin);
            ctx.lineTo(x, topMargin + stations.length * rowHeight);
            ctx.stroke();

            ctx.fillStyle = '#626792';
            ctx.font = '10px Inter';
            ctx.fillText(`+${i * 10}s`, x - 10, topMargin - 8);
        }

        const colors = ['#00f5d4', '#f72585', '#ffbe0b', '#4361ee', '#06d6a0', '#7209b7'];

        // Draw station rows
        stations.forEach((st, idx) => {
            const y = topMargin + idx * rowHeight;
            
            // Station Label
            ctx.fillStyle = '#f0f2fe';
            ctx.font = '500 12px Inter';
            ctx.fillText(st.name, 15, y + 20);

            // Row background line
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(leftMargin, y + 5, timelineWidth, rowHeight - 10);

            // Filter jobs for station
            const stationJobs = items.filter(j => j.stationName === st.name || j.stationId === st.id);
            stationJobs.forEach((job, jIdx) => {
                const startX = leftMargin + Math.min((job.start / 60) * timelineWidth, timelineWidth - 20);
                const barW = Math.max(((job.end - job.start) / 60) * timelineWidth, 40);
                
                const color = colors[jIdx % colors.length];
                
                // Draw rounded job bar
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.roundRect(startX, y + 6, barW, rowHeight - 12, 4);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                // Job text label
                ctx.fillStyle = '#000000';
                ctx.font = '700 10px Inter';
                const label = job.jobName || job.name || 'Order Item';
                ctx.fillText(label.substring(0, 10), startX + 6, y + 20);
            });
        });
    }

    return { init, update, setAlgorithm };
})();
