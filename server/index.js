const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory data storage (Render free tier has read-only filesystem)
let appData = { submissions: [], nextId: 1 };

// Read data from memory
function readData() {
    return appData;
}

// Write data to memory
function writeData(data) {
    appData = data;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Admin password (change this!)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ================================
// API Routes
// ================================

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin_' + Date.now() });
    } else {
        res.status(401).json({ success: false, error: 'Password salah' });
    }
});

// Get all submissions
app.get('/api/submissions', (req, res) => {
    try {
        const data = readData();
        res.json(data.submissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get stats
app.get('/api/stats', (req, res) => {
    try {
        const data = readData();
        const submissions = data.submissions;
        const paidCount = submissions.filter(s => s.paid).length;
        const uniqueNames = [...new Set(submissions.map(s => s.name.toLowerCase()))];

        res.json({
            totalAccounts: submissions.length,
            paidCount: paidCount,
            unpaidCount: submissions.length - paidCount,
            totalContributors: uniqueNames.length,
            totalPayout: paidCount * 4000,
            pendingPayout: (submissions.length - paidCount) * 4000
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new submission
app.post('/api/submissions', (req, res) => {
    try {
        const { name, email, wallet } = req.body;

        // Validate
        if (!name || !email || !wallet) {
            return res.status(400).json({ error: 'Semua field harus diisi' });
        }

        if (!email.toLowerCase().endsWith('@gmail.com')) {
            return res.status(400).json({ error: 'Email harus @gmail.com' });
        }

        const data = readData();

        // Check duplicate
        const existing = data.submissions.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(400).json({ error: 'Email ini sudah pernah disetor' });
        }

        // Add new submission
        const newSubmission = {
            id: data.nextId,
            name,
            email,
            wallet,
            paid: false,
            created_at: new Date().toISOString()
        };

        data.submissions.unshift(newSubmission);
        data.nextId++;
        writeData(data);

        res.json({
            success: true,
            id: newSubmission.id,
            message: 'Akun berhasil disetor!'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle payment status
app.patch('/api/submissions/:id/toggle-paid', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = readData();

        const submission = data.submissions.find(s => s.id === id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission tidak ditemukan' });
        }

        submission.paid = !submission.paid;
        writeData(data);

        res.json({
            success: true,
            paid: submission.paid,
            message: submission.paid ? 'Ditandai sebagai lunas' : 'Ditandai belum bayar'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete submission
app.delete('/api/submissions/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = readData();

        data.submissions = data.submissions.filter(s => s.id !== id);
        writeData(data);

        res.json({ success: true, message: 'Submission berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete all submissions
app.delete('/api/submissions', (req, res) => {
    try {
        writeData({ submissions: [], nextId: 1 });
        res.json({ success: true, message: 'Semua data berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Gmail Collector Server Running!');
    console.log('================================');
    console.log(`📍 Local:    http://localhost:${PORT}`);
    console.log(`📊 Admin:    http://localhost:${PORT}/admin.html`);
    console.log(`📝 Submit:   http://localhost:${PORT}/submit.html`);
    console.log('================================');
    console.log('');
});
