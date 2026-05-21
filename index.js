import express from "express";
import crypto from "crypto";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import TelegramBot from "node-telegram-bot-api";
import { CHANNELS, PORT } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN .env faylida topilmadi.");
  process.exit(1);
}

// polling: false — biz botni faqat API so'rovlari uchun ishlatamiz (getChatMember).
// Bu rejada bot xabarlarni qabul qilmaydi, faqat Telegram API ga so'rov yuboradi.
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Telegram WebApp initData ni tekshirish (xavfsizlik).
// Frontend yuborgan initData haqiqatan ham Telegram tomonidan imzolanganini
// tekshiramiz — bunsiz har kim istalgan user_id ni soxtalashtirishi mumkin.
// Hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ---------------------------------------------------------------------------
function verifyInitData(initData) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  // Parametrlarni alifbo tartibida "key=value" ko'rinishida joylash
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) return null;

  // auth_date eski bo'lmasligi kerak (24 soatdan oshmagan)
  const authDate = Number(params.get("auth_date"));
  if (authDate && Date.now() / 1000 - authDate > 86400) return null;

  try {
    return JSON.parse(params.get("user"));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bitta foydalanuvchi bitta kanalga obuna bo'lganini tekshirish
// ---------------------------------------------------------------------------
async function isMemberOf(channel, userId) {
  const chatId = channel.id || `@${channel.username}`;
  try {
    const member = await bot.getChatMember(chatId, userId);
    // "member", "administrator", "creator" — obuna bo'lgan holatlar.
    // "left", "kicked", "restricted" — obuna emas.
    return ["member", "administrator", "creator"].includes(member.status);
  } catch (err) {
    // Bot kanalda yo'q yoki kanal topilmadi — buni log qilamiz
    console.error(
      `getChatMember xato (${chatId}):`,
      err?.response?.body?.description || err.message
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// API: obunani tekshirish
// Frontend Telegram.WebApp.initData ni yuboradi.
// Javob: { ok, subscribed, channels: [{username, title, url, subscribed}] }
// ---------------------------------------------------------------------------
app.post("/api/check-subscription", async (req, res) => {
  const { initData } = req.body || {};
  const user = verifyInitData(initData);

  if (!user || !user.id) {
    return res.status(401).json({
      ok: false,
      error: "Telegram ma'lumotlari tasdiqlanmadi. Mini App ni Telegram orqali oching.",
    });
  }

  try {
    const results = await Promise.all(
      CHANNELS.map(async (ch) => ({
        username: ch.username,
        title: ch.title,
        url: ch.url || `https://t.me/${ch.username}`,
        subscribed: await isMemberOf(ch, user.id),
      }))
    );

    const allSubscribed = results.every((c) => c.subscribed);

    res.json({
      ok: true,
      subscribed: allSubscribed,
      channels: results,
      user: { id: user.id, first_name: user.first_name },
    });
  } catch (err) {
    console.error("check-subscription xato:", err);
    res.status(500).json({ ok: false, error: "Server xatosi." });
  }
});

// ---------------------------------------------------------------------------
// API: reytinglarni qaytarish.
// Faqat barcha kanallarga obuna bo'lgan foydalanuvchilar olishi mumkin.
// ---------------------------------------------------------------------------
app.post("/api/ratings", async (req, res) => {
  const { initData } = req.body || {};
  const user = verifyInitData(initData);

  if (!user || !user.id) {
    return res.status(401).json({ ok: false, error: "Avtorizatsiya xatosi." });
  }

  try {
    // Obunani server tomonida qayta tekshiramiz — frontendga ishonib bo'lmaydi
    const subscribed = (
      await Promise.all(CHANNELS.map((ch) => isMemberOf(ch, user.id)))
    ).every(Boolean);

    if (!subscribed) {
      return res.status(403).json({
        ok: false,
        error: "Reytingni ko'rish uchun barcha kanallarga obuna bo'ling.",
      });
    }

    const raw = await readFile(join(__dirname, "ratings.json"), "utf-8");
    res.json({ ok: true, ratings: JSON.parse(raw) });
  } catch (err) {
    console.error("ratings xato:", err);
    res.status(500).json({ ok: false, error: "Reytinglarni yuklab bo'lmadi." });
  }
});

// Statik fayllar (Mini App)
app.use(express.static(join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`   Tekshiriladigan kanallar: ${CHANNELS.map((c) => "@" + c.username).join(", ")}`);
});
