const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET - List all allocations with student and room details
router.get('/', (req, res) => {
    const statusFilter = req.query.status;
    let sql = `
        SELECT 
            a.allocation_id,
            a.student_id,
            a.room_id,
            DATE_FORMAT(a.allocated_on, '%Y-%m-%d') AS allocated_on,
            a.status,
            s.name AS student_name,
            s.roll_number,
            s.department,
            s.phone,
            r.room_number,
            r.room_type,
            r.floor
        FROM allocations a
        JOIN students s ON a.student_id = s.student_id
        JOIN rooms r ON a.room_id = r.room_id
    `;

    const params = [];
    if (statusFilter && (statusFilter === 'Active' || statusFilter === 'Completed')) {
        sql += ` WHERE a.status = ?`;
        params.push(statusFilter);
    }

    sql += ` ORDER BY a.allocation_id DESC`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET - Summary statistics for dashboard
router.get('/stats', (req, res) => {
    const queries = {
        totalStudents: 'SELECT COUNT(*) AS count FROM students',
        totalRooms: 'SELECT COUNT(*) AS count FROM rooms',
        availableRooms: "SELECT COUNT(*) AS count FROM rooms WHERE status = 'Available'",
        fullRooms: "SELECT COUNT(*) AS count FROM rooms WHERE status = 'Full'",
        maintenanceRooms: "SELECT COUNT(*) AS count FROM rooms WHERE status = 'Maintenance'",
        activeAllocations: "SELECT COUNT(*) AS count FROM allocations WHERE status = 'Active'",
        totalCapacity: 'SELECT COALESCE(SUM(capacity), 0) AS count FROM rooms'
    };

    const stats = {};
    const keys = Object.keys(queries);
    let completed = 0;

    keys.forEach(key => {
        db.query(queries[key], (err, result) => {
            if (err) {
                stats[key] = 0;
            } else {
                stats[key] = result[0].count;
            }
            completed++;
            if (completed === keys.length) {
                res.json(stats);
            }
        });
    });
});

// POST - Allocate room to student
router.post('/', (req, res) => {
    const { student_id, room_id, allocated_on } = req.body;

    if (!student_id || !room_id) {
        return res.status(400).json({ message: 'Both Student and Room must be selected.' });
    }

    const allocationDate = allocated_on || new Date().toISOString().split('T')[0];

    // 1. Check if student already has an active allocation
    const studentCheckSql = `SELECT allocation_id FROM allocations WHERE student_id = ? AND status = 'Active'`;
    db.query(studentCheckSql, [student_id], (err, studentAllocs) => {
        if (err) return res.status(500).json({ error: err.message });
        if (studentAllocs.length > 0) {
            return res.status(400).json({ message: 'This student already has an active room allocated.' });
        }

        // 2. Check room exists, status, capacity, and current active occupants
        const roomCheckSql = `
            SELECT 
                r.*,
                COUNT(CASE WHEN a.status = 'Active' THEN 1 END) AS current_occupancy
            FROM rooms r
            LEFT JOIN allocations a ON r.room_id = a.room_id
            WHERE r.room_id = ?
            GROUP BY r.room_id
        `;

        db.query(roomCheckSql, [room_id], (err2, roomResults) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (roomResults.length === 0) {
                return res.status(404).json({ message: 'Selected room not found.' });
            }

            const room = roomResults[0];
            if (room.status === 'Maintenance') {
                return res.status(400).json({ message: 'Selected room is under maintenance.' });
            }

            if (room.current_occupancy >= room.capacity) {
                return res.status(400).json({ message: `Room ${room.room_number} is already full (Capacity: ${room.capacity}).` });
            }

            // 3. Insert allocation
            const insertSql = `
                INSERT INTO allocations (student_id, room_id, allocated_on, status)
                VALUES (?, ?, ?, 'Active')
            `;

            db.query(insertSql, [student_id, room_id, allocationDate], (err3, insertResult) => {
                if (err3) return res.status(500).json({ error: err3.message });

                // 4. Update room status to 'Full' if capacity reached
                const newOccupancy = room.current_occupancy + 1;
                if (newOccupancy >= room.capacity) {
                    db.query("UPDATE rooms SET status = 'Full' WHERE room_id = ?", [room_id], (err4) => {
                        if (err4) console.error('Failed to update room status:', err4);
                    });
                }

                res.status(201).json({
                    message: 'Room allocated successfully!',
                    allocation_id: insertResult.insertId
                });
            });
        });
    });
});

// PUT - Vacate room / complete allocation
router.put('/:id/vacate', (req, res) => {
    const allocationId = req.params.id;

    // Find allocation first
    db.query('SELECT * FROM allocations WHERE allocation_id = ?', [allocationId], (err, allocs) => {
        if (err) return res.status(500).json({ error: err.message });
        if (allocs.length === 0) return res.status(404).json({ message: 'Allocation not found.' });

        const alloc = allocs[0];
        if (alloc.status === 'Completed') {
            return res.status(400).json({ message: 'This allocation is already marked as Completed / Vacated.' });
        }

        // Update status to 'Completed'
        db.query("UPDATE allocations SET status = 'Completed' WHERE allocation_id = ?", [allocationId], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });

            // Check room occupancy after vacating and update room status back to 'Available' if not in Maintenance
            const roomOccupancySql = `
                SELECT 
                    r.room_id, r.capacity, r.status,
                    COUNT(CASE WHEN a.status = 'Active' THEN 1 END) AS current_occupancy
                FROM rooms r
                LEFT JOIN allocations a ON r.room_id = a.room_id
                WHERE r.room_id = ?
                GROUP BY r.room_id
            `;

            db.query(roomOccupancySql, [alloc.room_id], (roomErr, roomRes) => {
                if (!roomErr && roomRes.length > 0) {
                    const r = roomRes[0];
                    if (r.status !== 'Maintenance' && r.current_occupancy < r.capacity) {
                        db.query("UPDATE rooms SET status = 'Available' WHERE room_id = ?", [alloc.room_id]);
                    }
                }
            });

            res.json({ message: 'Room vacated and allocation marked as Completed!' });
        });
    });
});

// DELETE - Delete allocation record
router.delete('/:id', (req, res) => {
    const allocationId = req.params.id;

    db.query('SELECT * FROM allocations WHERE allocation_id = ?', [allocationId], (err, allocs) => {
        if (err) return res.status(500).json({ error: err.message });
        if (allocs.length === 0) return res.status(404).json({ message: 'Allocation not found.' });

        const roomId = allocs[0].room_id;

        db.query('DELETE FROM allocations WHERE allocation_id = ?', [allocationId], (delErr) => {
            if (delErr) return res.status(500).json({ error: delErr.message });

            // Re-evaluate room status
            const roomSql = `
                SELECT 
                    r.room_id, r.capacity, r.status,
                    COUNT(CASE WHEN a.status = 'Active' THEN 1 END) AS current_occupancy
                FROM rooms r
                LEFT JOIN allocations a ON r.room_id = a.room_id
                WHERE r.room_id = ?
                GROUP BY r.room_id
            `;
            db.query(roomSql, [roomId], (rErr, rRes) => {
                if (!rErr && rRes.length > 0) {
                    const r = rRes[0];
                    if (r.status !== 'Maintenance' && r.current_occupancy < r.capacity) {
                        db.query("UPDATE rooms SET status = 'Available' WHERE room_id = ?", [roomId]);
                    }
                }
            });

            res.json({ message: 'Allocation record deleted successfully!' });
        });
    });
});

module.exports = router;
