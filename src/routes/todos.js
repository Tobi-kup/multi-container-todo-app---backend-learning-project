const express = require('express');
const mongoose = require('mongoose');
const Todo = require('../models/todo');

const router = express.Router();

// Prüft bei jeder Route mit :id, ob die ID gültig aussieht
router.param('id', (req, res, next, id) => {
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Ungültige Todo-ID' });
    }
    next();
});

// GET /todos
router.get('/', async (req, res) => {
    try {
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// POST /todos
router.post('/', async (req, res) => {
    try {
        const { title, description, completed } = req.body;
        const todo = await Todo.create({ title, description, completed });
        res.status(201).json(todo);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /todos/:id
router.get('/:id', async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if (!todo) {
            return res.status(404).json({ error: 'Todo nicht gefunden' });
        }
        res.json(todo);
    } catch (err) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// PUT /todos/:id
router.put('/:id', async (req, res) => {
    try {
        const todo = await Todo.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!todo) {
            return res.status(404).json({ error: 'Todo nicht gefunden' });
        }
        res.json(todo);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /todos/:id
router.delete('/:id', async (req, res) => {
    try {
        const todo = await Todo.findByIdAndDelete(req.params.id);
        if (!todo) {
            return res.status(404).json({ error: 'Todo nicht gefunden' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

module.exports = router;