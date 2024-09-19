const express = require('express');
const { registerUser, loginUser, addEvent, updateEventSlots, deleteEvent } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/events/add', addEvent);
router.post('/events/update', updateEventSlots);

// Corrected DELETE route with eventId as a route parameter
router.delete('/events/delete/:eventId', deleteEvent);

module.exports = router;
