# Gmail Collector 📧

Sistem penyetoran akun Gmail dengan backend server.

## 🚀 Deploy ke Render (GRATIS)

### Cara Cepat:
1. Upload folder ini ke GitHub
2. Buka https://render.com → Sign up
3. Klik **New +** → **Blueprint**
4. Connect GitHub → Pilih repo ini
5. Render akan otomatis baca `render.yaml`
6. Klik **Apply** → Tunggu deploy selesai
7. Dapat URL seperti: `https://gmail-collector-xxxx.onrender.com`

### Selesai! 🎉

---

## 📁 Struktur Project

```
gmail-collector/
├── public/          # Frontend
│   ├── index.html   # Landing page
│   ├── submit.html  # Form setor
│   ├── admin.html   # Dashboard admin
│   ├── styles.css   # Tema Man Utd
│   └── app.js       # Logic
├── server/          # Backend
│   ├── index.js     # Express server
│   └── package.json
├── render.yaml      # Config deploy
└── .gitignore
```

## 🖥️ Run Lokal

```bash
cd server
npm install
npm start
```

Buka: http://localhost:3000
