const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [], nextId: 1 }));
    }
}

function readData() {
    initDataFile();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin_' + Date.now() });
    } else {
        res.status(401).json({ success: false, error: 'Password salah' });
    }
});

app.get('/api/submissions', (req, res) => {
    res.json(readData().submissions);
});

app.get('/api/stats', (req, res) => {
    const data = readData();
    const paidCount = data.submissions.filter(s => s.paid).length;
    res.json({
        totalAccounts: data.submissions.length,
        paidCount,
        unpaidCount: data.submissions.length - paidCount,
        totalContributors: [...new Set(data.submissions.map(s => s.name.toLowerCase()))].length,
        totalPayout: paidCount * 4000
    });
});

app.post('/api/submissions', (req, res) => {
    const { name, email, wallet } = req.body;
    if (!name || !email || !wallet) return res.status(400).json({ error: 'Semua field harus diisi' });
    if (!email.toLowerCase().endsWith('@gmail.com')) return res.status(400).json({ error: 'Email harus @gmail.com' });
    
    const data = readData();
    if (data.submissions.find(s => s.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'Email sudah pernah disetor' });
    }
    
    data.submissions.unshift({
        id: data.nextId++,
        name, email, wallet,
        paid: false,
        created_at: new Date().toISOString()
    });
    writeData(data);
    res.json({ success: true });
});

app.patch('/api/submissions/:id/toggle-paid', (req, res) => {
    const data = readData();
    const s = data.submissions.find(s => s.id === parseInt(req.params.id));
    if (s) { s.paid = !s.paid; writeData(data); }
    res.json({ success: true, paid: s?.paid, message: s?.paid ? 'Ditandai lunas' : 'Ditandai belum bayar' });
});

app.delete('/api/submissions/:id', (req, res) => {
    const data = readData();
    data.submissions = data.submissions.filter(s => s.id !== parseInt(req.params.id));
    writeData(data);
    res.json({ success: true });
});

app.delete('/api/submissions', (req, res) => {
    writeData({ submissions: [], nextId: 1 });
    res.json({ success: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
