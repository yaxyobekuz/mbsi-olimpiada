# MBSI Olimpiada - Telegram Mini App

Ota-onalar farzandlari reytingini ko'rishi uchun Telegram Mini App.
Reytingni ko'rish uchun foydalanuvchi belgilangan **barcha kanallarga obuna** bo'lishi shart.
Obuna `getChatMember` Bot API metodi orqali server tomonda tekshiriladi.

## Fayllar

| Fayl | Vazifasi |
|------|----------|
| `index.js` | Express server + bot + obuna tekshiruvchi API |
| `config.js` | Kanallar ro'yxati va sozlamalar |
| `public/index.html` | Mini App (obuna gate + reyting jadvali) |
| `ratings.json` | O'quvchilar reytingi ma'lumotlari |
| `.env` | `BOT_TOKEN` (maxfiy, git'ga qo'shilmaydi) |

## O'rnatish

```bash
npm install
```

## Sozlash

### 1. Kanallarni kiriting - `config.js`

`CHANNELS` ro'yxatiga o'z kanallaringizni yozing (`@` belgisisiz):

```js
export const CHANNELS = [
  { username: "kanal1", title: "Kanal nomi", url: "https://t.me/kanal1" },
  { username: "kanal2", title: "Ikkinchi kanal", url: "https://t.me/kanal2" },
];
```

> **Muhim:** Bot har bir kanalda **administrator** bo'lishi shart - aks holda
> `getChatMember` obunani tekshira olmaydi. Kanal sozlamalari → Administratorlar →
> botni qo'shing.

### 2. Bot tokeni - `.env`

```
BOT_TOKEN=sizning_bot_tokeningiz
```

## Ishga tushirish (lokal)

```bash
npm start
```

Server `http://localhost:3000` da ishlaydi.

> Mini App'ni lokal brauzerda ochsangiz "Telegram orqali oching" xatosi chiqadi -
> bu normal holat. `initData` faqat Telegram ilovasi ichida mavjud bo'ladi.

## Telegram'ga ulash (deploy)

Mini App **HTTPS** manzilda bo'lishi shart. Bepul variantlar:

1. **Tezkor sinov uchun** - [ngrok](https://ngrok.com):
   ```bash
   ngrok http 3000
   ```
   Bergan `https://...` manzilini quyida ishlatasiz.

2. **Doimiy** - Render.com, Railway, VPS va h.k.

### BotFather'da Mini App'ni ulash

1. [@BotFather](https://t.me/BotFather) → `/mybots` → botingiz → **Bot Settings**
2. **Menu Button** (yoki **Configure Mini App**) → **Edit menu button URL**
3. HTTPS manzilni kiriting (hozir: `https://olimpiada.mysrv.uz/`)

Endi botni ochib pastdagi menyu tugmasini bossangiz Mini App ochiladi.

> **Muhim — inline tugma uchun domen ro'yxatdan o'tishi shart.**
> Bot har qanday xabarga javoban Mini App'ni ochuvchi `web_app` tugmasi
> yuboradi. Bu tugma ishlashi uchun Mini App domeni BotFather'da
> ro'yxatdan o'tgan bo'lishi kerak — yuqoridagi **Menu Button URL**
> sozlangach, domen avtomatik tasdiqlanadi. URL `config.js` dagi
> `WEBAPP_URL` bilan bir xil domenda bo'lishi shart.

## Qanday ishlaydi

**Bot bilan boshlanishi:** ota-ona botga istalgan xabar yozsa, bot javoban
"🏆 Reytingni ochish" tugmasini yuboradi — bu tugma Mini App'ni Telegram
ichida ochadi.

**Mini App ichida:**

1. Mini App ochilganda `telegram-web-app.js` orqali imzolangan `initData` olinadi.
2. Frontend `initData`'ni `/api/check-subscription` ga yuboradi.
3. Server `initData`'ni bot tokeni bilan **tekshiradi** (soxtalashtirishning oldini oladi),
   foydalanuvchi `id`'sini ajratib oladi.
4. Har bir kanal uchun `getChatMember` chaqiriladi.
5. Barcha kanalga obuna bo'lsa → `/api/ratings` reytingni qaytaradi.
   Aks holda → obuna sahifasi ko'rsatiladi.
6. Reytingda ota-ona istalgan o'quvchini sinf bo'yicha filtrlab yoki ism bo'yicha
   qidirib topadi.

## Xavfsizlik eslatmalari

- Obuna **har ikki** endpointda server tomonda tekshiriladi - frontendni chetlab o'tib bo'lmaydi.
- `initData` HMAC-SHA256 bilan tekshiriladi, 24 soatdan eski ma'lumot rad etiladi.
- `.env` (bot tokeni) hech qachon git'ga qo'shilmaydi.
