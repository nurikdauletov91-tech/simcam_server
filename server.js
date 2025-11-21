//-------------------------------------------------------------
//  RAW JPEG фото от ESP32/SIM7600 → Telegram
//-------------------------------------------------------------
const express = require("express");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
const PORT = process.env.PORT || 3000;

// ----- ТВОЙ БОТ И ЧАТ -----
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT;
// ---------------------------

// принимаем СЫРОЕ JPEG тело (не multipart!)
app.use("/upload", express.raw({ type: "*/*", limit: "20mb" }));

app.post("/upload", async (req, res) => {
    try {
        console.log("📸 Получено фото. Размер:", req.body.length);

        if (!req.body || req.body.length < 100) {
            console.log("❌ Фото пустое");
            return res.status(400).send("NO_IMAGE");
        }

        const filePath = "/tmp/photo.jpg";
        fs.writeFileSync(filePath, req.body);

        // Отправка в Telegram
        const form = new FormData();
        form.append("chat_id", TELEGRAM_CHAT_ID);
        form.append("photo", fs.createReadStream(filePath));

        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
            form,
            { headers: form.getHeaders() }
        );

        console.log("📤 Отправлено в Телеграм OK");

        res.send("OK");

    } catch (err) {
        console.error("❌ Ошибка:", err);
        res.status(500).send("FAIL");
    }
});

app.listen(PORT, () => {
    console.log(`🔥 Сервер слушает порт ${PORT}`);
});
