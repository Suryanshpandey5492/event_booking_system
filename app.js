require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize PostgreSQL client
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from "public" folder

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');

// Use routes
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);

// WebSocket setup
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle booking event
    socket.on('book-event', async ({ eventId, token }) => {
        console.log('Received token:', token); // Log the received token

        try {
            // Verify JWT token
            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    console.error('JWT verification failed:', err);
                    socket.emit('booking-error', 'Invalid token');
                    return;
                }

                // Check event availability
                const result = await pool.query('SELECT slots FROM events WHERE id = $1', [eventId]);
                const event = result.rows[0];
                
                if (event && event.slots > 0) {
                    // Update event slots
                    await pool.query('UPDATE events SET slots = slots - 1 WHERE id = $1', [eventId]);
                    
                    // Emit event update to all clients
                    io.emit('event-updated', eventId); 
                } else {
                    socket.emit('booking-error', 'No slots available');
                }
            });
        } catch (error) {
            console.error('Booking error:', error);
            socket.emit('booking-error', 'Booking error occurred');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Middleware to authenticate JWT for serving events
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.redirect('/'); // Redirect to login if no token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.redirect('/'); // Redirect to login if invalid token
        req.user = user;
        next();
    });
};

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Serve the events page
app.get('/events', authenticateToken, (req, res) => {
    res.sendFile(__dirname + '/public/events.html');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
