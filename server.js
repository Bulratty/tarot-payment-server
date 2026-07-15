const express = require("express");
const cors = require("cors");
const { YooCheckout } = require("@a2seven/yoo-checkout");
const cards = require("./cards.json");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const payments = {};

// ==================== ТАРО: генерация расклада без LLM ====================

function drawThreeCards() {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 3).map(card => ({
    ...card,
    reversed: Math.random() < 0.5
  }));
  return picked; // [прошлое, настоящее, будущее]
}

function cardCaption(card, positionLabel, positionEmoji) {
  const orientation = card.reversed ? "🔄 Перевёрнутое положение" : "✨ Прямое положение";
  const meaning = card.reversed ? card.reversed : card.upright;
  return (
    `${positionEmoji} ${positionLabel}\n\n` +
    `🎴 ${card.name}\n` +
    `${orientation}\n\n` +
    `💫 ${meaning}\n\n` +
    `🔑 Совет: ${card.advice}`
  );
}

function buildMessage(cardsDrawn) {
  const [past, present, future] = cardsDrawn;
  return (
    `🔮 ПОСЛАНИЕ ВСЕЛЕННОЙ\n\n` +
    `Карта «${past.name}» показывает, что привело тебя к текущей точке. ` +
    `Сейчас, с картой «${present.name}», ты находишься в состоянии, которое требует твоего внимания прямо сейчас. ` +
    `А «${future.name}» указывает направление, куда ведёт твой путь, если ты продолжишь двигаться в этом русле.\n\n` +
    `💫 Энергии уже в движении. Доверься мудрости карт.`
  );
}

async function sendThreeCardsReading(chatId) {
  const cardsDrawn = drawThreeCards();
  const [past, present, future] = cardsDrawn;

  const positions = [
    { card: past, label: "ПРОШЛОЕ — что привело тебя сюда", emoji: "🕰️" },
    { card: present, label: "НАСТОЯЩЕЕ — твоя текущая точка силы", emoji: "🔮" },
    { card: future, label: "БУДУЩЕЕ — куда ведёт твой путь", emoji: "🌟" }
  ];

  // Заголовок
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "✨ РАСКЛАД «ТРИ КАРТЫ»\n\nПогружение в потоки времени\n━━━━━━━━━━━━━━━━━━━━"
    })
  });

  // Три карты фото + подпись (с retry на случай сбоя загрузки картинки)
  for (const pos of positions) {
    let result = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: pos.card.image,
          caption: cardCaption(pos.card, pos.label, pos.emoji)
        })
      });
      result = await res.json();
      if (result.ok) break;
      console.error(`SEND PHOTO FAILED (attempt ${attempt}):`, pos.card.name, result);
      await new Promise(r => setTimeout(r, 800)); // пауза перед повтором
    }

    // Если фото так и не ушло после 3 попыток — шлём хотя бы текст, чтобы карта не потерялась
    if (!result || !result.ok) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: cardCaption(pos.card, pos.label, pos.emoji)
        })
      });
      console.error("PHOTO REPLACED WITH TEXT FALLBACK:", pos.card.name);
    }
  }

  // Послание + кнопка возврата в меню
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildMessage(cardsDrawn) + "\n\n━━━━━━━━━━━━━━━━━━━━\n🔄 Нажмите кнопку ниже чтобы выбрать другой расклад",
      reply_markup: {
        inline_keyboard: [[{ text: "🔄 Выбрать другой расклад", callback_data: "back_to_menu" }]]
      }
    })
  });
}

// ==================== СЕРВЕР ====================

app.get("/", (req, res) => {
  res.send("OK");
});

app.post("/create-payment", async (req, res) => {
  try {
    console.log("=== CREATE PAYMENT REQUEST ===");
    console.log(req.body);

    const { amount, description, user_id, chat_id, product } = req.body;

    const yooCheckout = new YooCheckout({
      shopId: process.env.YOOKASSA_SHOP_ID,
      secretKey: process.env.YOOKASSA_SECRET_KEY
    });

    const payment = await yooCheckout.createPayment({
      amount: { value: amount, currency: "RUB" },
      confirmation: {
        type: "redirect",
        return_url: "https://t.me/arcana_cards_bot?start=paid_three_cards"
      },
      capture: true,
      description,
      receipt: {
        customer: { email: "test@example.com" },
        items: [
          {
            description,
            quantity: 1,
            amount: { value: amount, currency: "RUB" },
            vat_code: 1,
            payment_subject: "service",
            payment_mode: "full_payment"
          }
        ]
      }
    });

    payments[payment.id] = { user_id, chat_id, product, status: "pending" };

    console.log("SAVED PAYMENT:", payments[payment.id]);
    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/yookassa/webhook", async (req, res) => {
  console.log("=== YOOKASSA WEBHOOK ===");
  console.log(JSON.stringify(req.body, null, 2));

  const event = req.body;

  if (event.event === "payment.succeeded") {
    const paymentId = event.object.id;
    console.log("SUCCESS PAYMENT:", paymentId);

    const payment = payments[paymentId];

    if (payment) {
      payment.status = "paid";
      console.log("PAYMENT UPDATED:", payment);

      if (payment.chat_id) {
        try {
          if (payment.product === "three_cards") {
            await sendThreeCardsReading(payment.chat_id);
            console.log("THREE CARDS READING SENT");
          } else {
            // заглушка для остальных продуктов, пока не подключены
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: payment.chat_id,
                text: "🔮 Оплата получена! Ваш расклад готовится."
              })
            });
          }
        } catch (tgError) {
          console.error("TELEGRAM SEND ERROR:", tgError);
        }
      } else {
        console.log("NO CHAT ID");
      }
    } else {
      console.error("PAYMENT NOT FOUND IN MEMORY:", paymentId, Object.keys(payments));
    }
  }

  res.sendStatus(200);
});

app.get("/check-payment", (req, res) => {
  const userId = req.query.user_id;
  const payment = Object.values(payments).find(p => p.user_id === userId);

  if (!payment) {
    return res.json({ paid: false });
  }

  res.json({ paid: payment.status === "paid", product: payment.product });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});