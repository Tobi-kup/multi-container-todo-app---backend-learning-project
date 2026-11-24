const express = require('express');
const mongoose = require('mongoose');
const todosRouter = require('./routes/todos');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok!!' });
});
app.use('/todos', todosRouter);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/todos';

async function start() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Mit MongoDB verbunden');
        app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
    } catch (err) {
        console.error('Verbindung zu MongoDB fehlgeschlagen:', err.message);
        process.exit(1);
    }
}

start();