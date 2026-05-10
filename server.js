const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = 'database.json';

// Tự tạo database nếu chưa có
const initDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ keys: {} }));
    }
};
initDB();

// --- CÁC HÀM XỬ LÝ DATABASE ---
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- ROUTE DÀNH CHO ADMIN (Dùng cho index.html) ---

// 1. Liệt kê toàn bộ Key
app.get('/admin/list', (req, res) => {
    const db = readDB();
    res.json(db.keys);
});

// 2. Thêm hoặc bớt thời gian (phút)
app.get('/admin/add-time', (req, res) => {
    const { key, mins } = req.query;
    const db = readDB();
    if (db.keys[key]) {
        const extraMs = parseInt(mins) * 60 * 1000;
        // Nếu đã hết hạn thì tính từ hiện tại, nếu chưa thì cộng dồn
        const currentExpiry = db.keys[key].expiry;
        db.keys[key].expiry = (currentExpiry > Date.now() ? currentExpiry : Date.now()) + extraMs;
        writeDB(db);
        res.json({ status: "success" });
    } else {
        res.status(404).json({ status: "error" });
    }
});

// 3. Khóa hoặc Mở khóa Key
app.get('/admin/toggle-ban', (req, res) => {
    const { key, status } = req.query;
    const db = readDB();
    if (db.keys[key]) {
        db.keys[key].banned = (status === 'true');
        writeDB(db);
        res.json({ status: "success" });
    } else {
        res.status(404).json({ status: "error" });
    }
});

// 4. Xóa Key
app.get('/admin/delete', (req, res) => {
    const { key } = req.query;
    const db = readDB();
    if (db.keys[key]) {
        delete db.keys[key];
        writeDB(db);
        res.json({ status: "success" });
    } else {
        res.status(404).json({ status: "error" });
    }
});

// 5. Tạo Key mới (Hỗ trợ cả 'mins' và 'days')
app.get('/gen', (req, res) => {
    const { mins, days } = req.query;
    const db = readDB();
    const newKey = "VHP-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    let durationMs = 0;
    if (mins) durationMs = parseInt(mins) * 60 * 1000;
    if (days) durationMs = parseInt(days) * 24 * 60 * 60 * 1000;

    db.keys[newKey] = {
        expiry: Date.now() + durationMs,
        hwid: null,
        banned: false
    };
    writeDB(db);
    res.send(newKey); // Trả về text để khớp logic loadKeys
});

// --- ROUTE DÀNH CHO TOOL (Xác thực) ---
app.get('/verify', (req, res) => {
    const { key, hwid } = req.query;
    const db = readDB();
    const keyData = db.keys[key];

    if (!keyData) return res.json({ status: "error", message: "KEY KHÔNG TỒN TẠI" });
    if (keyData.banned) return res.json({ status: "error", message: "KEY ĐÃ BỊ KHÓA" });
    if (Date.now() > keyData.expiry) return res.json({ status: "error", message: "KEY HẾT HẠN" });

    if (!keyData.hwid) {
        db.keys[key].hwid = hwid;
        writeDB(db);
    } else if (keyData.hwid !== hwid) {
        return res.json({ status: "error", message: "SAI MÁY (HWID)" });
    }

    res.json({ status: "success", message: "OK" });
});

app.listen(PORT, () => console.log(`Server chạy tại port ${PORT}`));
