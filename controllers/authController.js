const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Register user
const registerUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into the database
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Check if user exists
        const result = await pool.query('SELECT id, password FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

async function addEvent(req, res) {
    const { title, slots, date } = req.body;

    try {
        await pool.query(
            'INSERT INTO events (title, date, slots, created_at) VALUES ($1, $2, $3, NOW())',
            [title, date, slots] // Include date in the query
        );
        res.status(200).send('Event added successfully');
    } catch (err) {
        console.error('Error adding event:', err);
        res.status(500).send('Failed to add event');
    }
}

// Update event slots
const updateEventSlots = async (req, res) => {
    const { eventId, slots } = req.body;

    if (slots == null || !eventId) {
        return res.status(400).json({ message: 'Event ID and slots are required' });
    }

    try {
        const result = await pool.query(
            'UPDATE events SET slots = $1 WHERE id = $2',
            [slots, eventId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// In authController.js
const deleteEvent = async (req, res) => {
    const { eventId } = req.params; // Extract eventId from route parameters

    if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
    }

    try {
        // Perform the DELETE operation in the PostgreSQL database
        const result = await pool.query(
            'DELETE FROM events WHERE id = $1',
            [eventId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Error deleting event', error: error.message });
    }
};

module.exports = { registerUser, loginUser, addEvent, updateEventSlots, deleteEvent };