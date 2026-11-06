const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET - Display all students with their room allocation status if any
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            s.*,
            a.allocation_id,
            a.room_id,
            a.status AS allocation_status,
            r.room_number
        FROM students s
        LEFT JOIN allocations a ON s.student_id = a.student_id AND a.status = 'Active'
        LEFT JOIN rooms r ON a.room_id = r.room_id
        ORDER BY s.student_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET - Get unallocated students (students without an active room)
router.get('/unallocated', (req, res) => {
    const sql = `
        SELECT s.* 
        FROM students s
        LEFT JOIN allocations a ON s.student_id = a.student_id AND a.status = 'Active'
        WHERE a.allocation_id IS NULL
        ORDER BY s.name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET - Single student by id
router.get('/:id', (req, res) => {
    const sql = 'SELECT * FROM students WHERE student_id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Student not found' });
        res.json(results[0]);
    });
});

// POST - Add student
router.post('/', (req, res) => {
    const { name, roll_number, department, year, phone, email, gender } = req.body;

    if (!name || !roll_number) {
        return res.status(400).json({ message: 'Name and Roll Number are required.' });
    }

    const sql = `INSERT INTO students
    (name, roll_number, department, year, phone, email, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [name.trim(), roll_number.trim(), department || null, year ? parseInt(year) : null, phone || null, email || null, gender || null],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Roll number already exists. Please use a unique roll number.' });
                }
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: 'Student added successfully!',
                student_id: result.insertId
            });
        });
});

// PUT - Update student
router.put('/:id', (req, res) => {
    const { name, roll_number, department, year, phone, email, gender } = req.body;

    if (!name || !roll_number) {
        return res.status(400).json({ message: 'Name and Roll Number are required.' });
    }

    const sql = `UPDATE students SET
    name=?, roll_number=?, department=?, year=?, phone=?, email=?, gender=?
    WHERE student_id=?`;

    db.query(sql, [name.trim(), roll_number.trim(), department || null, year ? parseInt(year) : null, phone || null, email || null, gender || null, req.params.id],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Roll number already exists for another student.' });
                }
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Student not found' });
            }

            res.json({ message: 'Student updated successfully!' });
        });
});

// DELETE - Delete student
router.delete('/:id', (req, res) => {
    // Check if student has active allocations
    const checkSql = 'SELECT * FROM allocations WHERE student_id = ? AND status = "Active"';
    db.query(checkSql, [req.params.id], (checkErr, activeAllocs) => {
        if (checkErr) return res.status(500).json({ error: checkErr.message });

        if (activeAllocs.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete student with active room allocation. Please vacate their room first.'
            });
        }

        db.query('DELETE FROM students WHERE student_id=?', [req.params.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Student not found' });
            }

            res.json({ message: 'Student deleted successfully!' });
        });
    });
});

module.exports = router;
