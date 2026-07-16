const express = require("express");
const cors = require("cors");
const { YooCheckout } = require("@a2seven/yoo-checkout");
const { createClient } = require("@supabase/supabase-js");
const cards = require("./cards.json");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ==================== КОНФИГ РАСКЛАДОВ ====================
// Ключ — это то самое значение "product", которое приходит в /create-payment
// из соответствующего узла Botpress (BuyThreeCards, AbundancePayment, LovePayment, ...).
// Если у тебя в коде узла зашита другая строка — просто поменяй ключ здесь.

const SPREADS = {
  three_cards: {
    title: "✨ РАСКЛАД «ТРИ КАРТЫ»",
    subtitle: "Погружение в потоки времени",
    positions: [
      { label: "ПРОШЛОЕ — что привело тебя сюда", emoji: "🕰️" },
      { label: "НАСТОЯЩЕЕ — твоя текущая точка силы", emoji: "🔮" },
      { label: "БУДУЩЕЕ — куда ведёт твой путь", emoji: "🌟" }
    ],
    buildFinalMessage: (c) =>
      `Карта «${c[0].name}» показывает, что привело тебя к текущей точке. ` +
      `Сейчас, с картой «${c[1].name}», ты находишься в состоянии, которое требует твоего внимания прямо сейчас. ` +
      `А «${c[2].name}» указывает направление, куда ведёт твой путь, если ты продолжишь двигаться в этом русле.`
  },

  abundance: {
    title: "💰 РАСКЛАД «АБУНДАНС»",
    subtitle: "Поток изобилия и финансовая энергия",
    positions: [
      { label: "ТЕКУЩИЙ ДЕНЕЖНЫЙ ПОТОК — где ты сейчас", emoji: "💵" },
      { label: "ЧТО БЛОКИРУЕТ ИЗОБИЛИЕ", emoji: "🔒" },
      { label: "ПОТЕНЦИАЛ РОСТА — куда двигаться", emoji: "🌱" }
    ],
    buildFinalMessage: (c) =>
      `Карта «${c[0].name}» отражает твою нынешнюю денежную энергию. ` +
      `«${c[1].name}» указывает на то, что сдерживает твой финансовый поток. ` +
      `А «${c[2].name}» показывает, куда стоит направить усилия, чтобы открыть изобилие.`
  },

  love: {
    title: "💞 РАСКЛАД «НИТИ ЛЮБВИ»",
    subtitle: "Связь сердец и энергия отношений",
    positions: [
      { label: "ТЫ — твои чувства и роль в отношениях", emoji: "💗" },
      { label: "ПАРТНЁР — его энергия и позиция", emoji: "💘" },
      { label: "СВЯЗЬ — что происходит между вами", emoji: "🔗" }
    ],
    buildFinalMessage: (c) =>
      `Карта «${c[0].name}» раскрывает твои чувства и то, что ты вкладываешь в отношения. ` +
      `«${c[1].name}» говорит об энергии партнёра. ` +
      `А «${c[2].name}» показывает саму нить, которая связывает вас двоих.`
  },

  gates_of_fate: {
    title: "🚪 РАСКЛАД «ВРАТА СУДЬБЫ»",
    subtitle: "Пять карт, открывающих твой путь",
    positions: [
      { label: "СИТУАЦИЯ — суть происходящего", emoji: "🌀" },
      { label: "СКРЫТОЕ ВЛИЯНИЕ — что действует незримо", emoji: "🌑" },
      { label: "ПРЕПЯТСТВИЕ — что стоит на пути", emoji: "⚔️" },
      { label: "СОВЕТ — как поступить", emoji: "🧭" },
      { label: "ИТОГ — куда ведут врата", emoji: "🚪" }
    ],
    buildFinalMessage: (c) =>
      `Ситуация «${c[0].name}» разворачивается под скрытым влиянием «${c[1].name}». ` +
      `Препятствие «${c[2].name}» проверяет тебя на прочность, но совет карты «${c[3].name}» указывает путь. ` +
      `Врата судьбы открываются к «${c[4].name}».`
  }
};

// ==================== ТАРО: генерация расклада без LLM ====================

function drawCards(count) {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(card => ({
    ...card,
    reversed: Math.random() < 0.5
  }));
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

async function sendReading(chatId, spreadKey) {
  const spread = SPREADS[spreadKey];
  if (!spread) {
    throw new Error(`Unknown spread: ${spreadKey}`);
  }

  const cardsDrawn = drawCards(spread.positions.length);

  // Заголовок
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${spread.title}\n\n${spread.subtitle}\n━━━━━━━━━━━━━━━━━━━━`
    })
  });

  // Карты фото + подпись (с retry и паузой между картами)
  for (let i = 0; i < spread.positions.length; i++) {
    const card = cardsDrawn[i];
    const pos = spread.positions[i];
    let result = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: card.image,
          caption: cardCaption(card, pos.label, pos.emoji)
        })
      });
      result = await res.json();
      if (result.ok) break;
      console.error(`SEND PHOTO FAILED (attempt ${attempt}):`, card.name, result);
      await new Promise(r => setTimeout(r, 800));
    }

    if (!result || !result.ok) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: cardCaption(card, pos.label, pos.emoji)
        })
      });
      console.error("PHOTO REPLACED WITH TEXT FALLBACK:", card.name);
    }

    if (i < spread.positions.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Послание + кнопка возврата в меню
  const finalText =
    `🔮 ПОСЛАНИЕ ВСЕЛЕННОЙ\n\n${spread.buildFinalMessage(cardsDrawn)}\n\n` +
    `💫 Энергии уже в движении. Доверься мудрости карт.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n🔄 Нажмите кнопку ниже чтобы выбрать другой расклад`;

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: finalText,
      reply_markup: {
        inline_keyboard: [[{ text: "🔄 Выбрать другой расклад", url: "https://t.me/arcana_cards_bot?start=menu" }]]
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
        return_url: "https://t.me/arcana_cards_bot"
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

    const { error: dbError } = await supabase
      .from("payments")
      .insert({ id: payment.id, user_id, chat_id, product, status: "pending" });

    if (dbError) {
      console.error("SUPABASE INSERT ERROR:", dbError);
      return res.status(500).json({ error: "Failed to save payment" });
    }

    console.log("SAVED PAYMENT:", payment.id);
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

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) {
      console.error("PAYMENT NOT FOUND IN DB:", paymentId, fetchError);
      return res.sendStatus(200);
    }

    // Защита от повторной обработки одного и того же вебхука
    if (payment.status === "paid") {
      console.log("PAYMENT ALREADY PROCESSED:", paymentId);
      return res.sendStatus(200);
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update({ status: "paid" })
      .eq("id", paymentId);

    if (updateError) {
      console.error("SUPABASE UPDATE ERROR:", updateError);
    } else {
      console.log("PAYMENT UPDATED:", payment.id, payment.product);
    }

    if (payment.chat_id) {
      try {
        if (SPREADS[payment.product]) {
          await sendReading(payment.chat_id, payment.product);
          console.log("READING SENT:", payment.product);
        } else {
          console.error("UNKNOWN PRODUCT, SENDING FALLBACK TEXT:", payment.product);
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
  }

  res.sendStatus(200);
});

app.get("/check-payment", async (req, res) => {
  const userId = req.query.user_id;

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("SUPABASE CHECK-PAYMENT ERROR:", error);
    return res.status(500).json({ error: "Failed to check payment" });
  }

  if (!payment) {
    return res.json({ paid: false });
  }

  res.json({ paid: payment.status === "paid", product: payment.product });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});