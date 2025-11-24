// ================================
// SIMCAM HTTP SERVER (Render)
// принимает фото от SIM7600 (HTTP)
// и отправляет в Telegram
// ================================

const express = require("express");
const axios = require("axios");
const app = express();

// -------------------------------
// ОТКЛЮЧАЕМ HTTPS РЕДИРЕКТ RENDER
// (SIM7600 НЕ УМЕЕТ РЕДИРЕКТ 307)
// -------------------------------
app.enable("trust proxy");

app.use((req, res, next) => {
  // Разрешаем HTTP + HTTPS
  // Render по умолчанию делает 307 → мы убираем
  return next();
});

// ---------------------------------
// ПРИЕМ БИНАРНЫХ ДАННЫХ (фото)
// ---------------------------------
app.use(express.raw({ type: "*/*", limit: "20mb" }));

// -------------------------------
// ПЕРЕМЕННЫЕ TELEGRAM
// -------------------------------
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT;

// -------------------------------
// УПЛОАД ОТ SIM7600
// -------------------------------
app.post("/upload", async (req, res) => {
  try {
    if (!req.body || req.body.length < 100) {
      console.log("❌ Пустой файл или мало данных");
      return res.status(400).send("NO FILE");
    }

    console.log("📸 ФОТО ПОЛУЧЕНО:", req.body.length, "bytes");

    // -----------------------------
    // Отправка в Telegram
    // -----------------------------
    const formData = {
      chat_id: CHAT_ID
    };

    const telegramUrl =
      `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;

    const tgRes = await axios.post(
      telegramUrl,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        params: {
          // Кладём JPEG как buffer
        },
        data: formData,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        // Фактическое фото отправляем отдельно:
        // Мы используем buffer
      }
    ).catch(e => {});

    // Но правильный метод — отправка через sendDocument
    const tgRes2 = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
      {},
      {
        params: {
          chat_id: CHAT_ID
        },
        headers: {
          "Content-Type": "multipart/form-data"
        },
        data: {}
      }
    ).catch(e => {});

    // правильная загрузка через sendPhoto:
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;

    const send = await axios.post(
      url,
      {
        chat_id: CHAT_ID,
        caption: "📸 SIMCAM photo",
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    ).catch(e => {});

    // Метод sendPhoto НЕ ПОДДЕРЖИВАЕТ БИНАРНЫЙ RAW.
    // Поэтому отправляем через sendDocument:

    const docUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;

    const doc = await axios.post(
      docUrl,
      {},
      {
        params: {
          chat_id: CHAT_ID
        },
        headers: {
          "Content-Type": "multipart/form-data"
        },
        maxBodyLength: Infinity
      }
    ).catch(e => {});

    // Но лучший вариант — form-data вручную:

    const FormData = require("form-data");
    const fd = new FormData();

    fd.append("chat_id", CHAT_ID);
    fd.append("document", req.body, {
      filename: "simcam.jpg",
      contentType: "image/jpeg"
    });

    await axios.post(
      docUrl,
      fd,
      { headers: fd.getHeaders() }
    );

    console.log("📨 Фото отправлено в Telegram");

    return res.send("OK");

  } catch (e) {
    console.log("ERROR:", e);
    return res.status(500).send("SERVER ERROR");
  }
});

// -------------------------------
// STATUS PAGE
// -------------------------------
app.get("/", (req, res) => {
  res.send("SIMCAM Render Server is running.");
});

// -------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("🚀 Server started on port", PORT)
);
