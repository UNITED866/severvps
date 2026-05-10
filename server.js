const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Kết nối tới MongoDB Atlas
const MONGO_URI = "mongodb+srv://VanHiep:hzetnz212@cluster0.d6zunjj.mongodb.net/VanHiepMod?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Đã kết nối MongoDB thành công!"))
    .catch(e => console.error("❌ Lỗi kết nối MongoDB:", e));

// Cấu trúc dữ liệu Key
const KeySchema = new mongoose.Schema({
    key: { type: String, unique: true },
    expiry: Number,
    hwid: { type: String, default: null },
    banned: { type: Boolean, default: false }
});
const KeyModel = mongoose.model('Key', KeySchema);

// Trang chủ để kiểm tra server
app.get('/', (req, res) => {
    res.send("<h1>SERVER VANHIEP MOD ĐANG HOẠT ĐỘNG ✅</h1>");
});

// API lấy danh sách Key cho Admin Panel
app.get('/admin/list', async (req, res) => {
    try {
        const keys = await KeyModel.find();
        let result = {};
        keys.forEach(k => { result[k.key] = k; });
        res.json(result);
    } catch (err) { res.status(500).send(err); }
});

// API Tạo Key mới
app.get('/gen', async (req, res) => {
    const { mins, days } = req.query;
    const newKeyName = "VHP-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    let durationMs = mins ? parseInt(mins) * 60000 : (days ? parseInt(days) * 86400000 : 0);

    try {
        const newKey = new KeyModel({
            key: newKeyName,
            expiry: Date.now() + durationMs
        });
        await newKey.save();
        res.send(newKeyName);
    } catch (err) { res.status(500).send("Lỗi tạo key"); }
});

// API Xóa Key
app.get('/admin/delete', async (req, res) => {
    await KeyModel.deleteOne({ key: req.query.key });
    res.json({ status: "success" });
});

// API Cộng/Trừ thời gian
app.get('/admin/add-time', async (req, res) => {
    const { key, mins } = req.query;
    const keyData = await KeyModel.findOne({ key });
    if (keyData) {
        keyData.expiry = Math.max(keyData.expiry, Date.now()) + (parseInt(mins) * 60000);
        await keyData.save();
        res.json({ status: "success" });
    } else { res.status(404).send("Không tìm thấy key"); }
});

// API Khóa/Mở khóa Key
app.get('/admin/toggle-ban', async (req, res) => {
    const { key, status } = req.query;
    await KeyModel.updateOne({ key }, { banned: status === 'true' });
    res.json({ status: "success" });
});

// API Xác thực Key cho Tool (Member dùng)
app.get('/verify', async (req, res) => {
    const { key, hwid } = req.query;
    const keyData = await KeyModel.findOne({ key });

    if (!keyData) return res.json({ status: "error", message: "KEY KHÔNG TỒN TẠI" });
    if (keyData.banned) return res.json({ status: "error", message: "KEY BỊ KHÓA" });
    if (Date.now() > keyData.expiry) return res.json({ status: "error", message: "KEY HẾT HẠN" });

    if (!keyData.hwid) {
        keyData.hwid = hwid;
        await keyData.save();
    } else if (keyData.hwid !== hwid) {
        return res.json({ status: "error", message: "SAI MÁY (HWID)" });
    }
    res.json({ status: "success", message: "XÁC THỰC THÀNH CÔNG" });
});

app.listen(PORT, () => console.log(`Server đang chạy tại port ${PORT}`));
