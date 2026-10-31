const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const { testConnection } = require('./db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const ordersRouter = require('./routes/orders');
const stationsRouter = require('./routes/stations');
const inventoryRouter = require('./routes/inventory');
const menuRouter = require('./routes/menu');
const dashboardRouter = require('./routes/dashboard');
const kitchensRouter = require('./routes/kitchens');
let chatRouter;
try { chatRouter = require('./routes/chat'); } catch(e) { console.warn('chat route not loaded:', e.message); }

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
    cors: { origin: '*' }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/orders', ordersRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/menu', menuRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/kitchens', kitchensRouter);
if (chatRouter) app.use('/api/chat', chatRouter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Global Error Handler
app.use(errorHandler);

// Socket.IO Connection Handler
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

// Init scheduler engine
let engine;
try {
    engine = require('./scheduler/engine');
} catch (e) {
    console.warn("Scheduler engine module not found, skipping init.");
}

const PORT = process.env.PORT || 3000;

// Prevent server crashes on unhandled database errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection (e.g. Database offline):', reason.message || reason);
});

process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err.message || err);
});

// Start Server
const startServer = async () => {
    await testConnection();
    
    if (engine && typeof engine.init === 'function') {
        try {
            await engine.init();
            console.log('Scheduler engine initialized.');
        } catch (error) {
            console.error('Failed to initialize scheduler engine:', error.message);
        }
    }

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
