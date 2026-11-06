const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET - Display all rooms with calculated current occupancy and occupants list
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            r.*,
            COUNT(CASE WHEN a.status = 'Active' THEN 1 END) AS current_occupancy,
            (r.capacity - COUNT(CASE WHEN a.status = 'Active' THEN 1 END)) AS available_beds,
            GROUP_CONCAT(CASE WHEN a.status = 'Active' THEN s.name END SEPARATOR ', ') AS occupants
        FROM rooms r
        LEFT JOIN allocations a ON r.room_id = a.room_id
        LEFT JOIN students s ON a.student_id = s.student_id
        GROUP BY r.room_id
        ORDER BY r.floor ASC, r.room_number ASC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET - Available rooms (have free beds and not in maintenance)
router.get('/available', (req, res) => {
    const sql = `
        SELECT 
            r.*,
            COUNT(CASE WHEN a.status = 'Active' THEN 1 END) AS current_occupancy,
            (r.capacity - COUNT(CASE WHEN a.status = 'Active' THEN 1 END)) AS available_beds,
            GROUP_CONCAT(CASE WHEN a.status = 'Active' THEN s.name END SEPARATOR ', ') AS occupants
        FROM rooms r
        LEFT JOIN allocations a ON r.room_id = a.room_id
        LEFT JOIN students s ON a.student_id = s.student_id
        WHERE r.status != 'Maintenance'
        GROUP BY r.room_id
        HAVING available_beds > 0
        ORDER BY r.floor ASC, r.room_number ASC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET - Single room
router.get('/:id', (req, res) => {
    const sql = `
        SELECT 
            r.*,
            COUNT(CASE WHEN a.status = 'Active' THEN 1 END) AS current_occupancy,
            (r.capacity - COUNT(CASE WHEN a.status = 'Active' THEN 1 END)) AS available_beds,
            GROUP_CONCAT(CASE WHEN a.status = 'Active' THEN s.name END SEPARATOR ', ') AS occupants
        FROM rooms r
        LEFT JOIN allocations a ON r.room_id = a.room_id
        LEFT JOIN students s ON a.student_id = s.student_id
        WHERE r.room_id = ?
        GROUP BY r.room_id
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Room not found' });
        res.json(results[0]);
    });
});

// POST - Add room
router.post('/', (req, res) => {
    const { room_number, room_type, capacity, floor, status } = req.body;

    if (!room_number || !capacity) {
        return res.status(400).json({ message: 'Room number and capacity are required.' });
    }

    const roomCapacity = parseInt(capacity);
    if (isNaN(roomCapacity) || roomCapacity <= 0) {
        return res.status(400).json({ message: 'Capacity must be a positive integer.' });
    }

    const roomStatus = status || 'Available';
    const roomFloor = floor !== undefined && floor !== '' ? parseInt(floor) : null;

    const sql = `INSERT INTO rooms (room_number, room_type, capacity, floor, status)
                 VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [room_number.trim(), room_type || 'Single Sharing', roomCapacity, roomFloor, roomStatus],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: `Room number '${room_number}' already exists.` });
                }
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: 'Room added successfully!',
                room_id: result.insertId
            });
        });
});

// PUT - Update room
router.put('/:id', (req, res) => {
    const { room_number, room_type, capacity, floor, status } = req.body;

    if (!room_number || !capacity) {
        return res.status(400).json({ message: 'Room number and capacity are required.' });
    }

    const roomCapacity = parseInt(capacity);
    if (isNaN(roomCapacity) || roomCapacity <= 0) {
        return res.status(400).json({ message: 'Capacity must be a positive integer.' });
    }

    const roomStatus = status || 'Available';
    const roomFloor = floor !== undefined && floor !== '' ? parseInt(floor) : null;

    const sql = `UPDATE rooms SET
        room_number = ?,
        room_type = ?,
        capacity = ?,
        floor = ?,
        status = ?
        WHERE room_id = ?`;

    db.query(sql, [room_number.trim(), room_type || 'Single Sharing', roomCapacity, roomFloor, roomStatus, req.params.id],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: `Room number '${room_number}' already exists.` });
                }
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Room not found' });
            }

            res.json({ message: 'Room updated successfully!' });
        });
});

// DELETE - Delete room
router.delete('/:id', (req, res) => {
    // Check if room has active allocations
    const checkSql = 'SELECT * FROM allocations WHERE room_id = ? AND status = "Active"';
    db.query(checkSql, [req.params.id], (checkErr, activeAllocs) => {
        if (checkErr) return res.status(500).json({ error: checkErr.message });

        if (activeAllocs.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete room with active student allocations. Please vacate or reallocate students first.'
            });
        }

        db.query('DELETE FROM rooms WHERE room_id = ?', [req.params.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Room not found' });
            }

            res.json({ message: 'Room deleted successfully!' });
        });
    });
});

module.exports = router;
