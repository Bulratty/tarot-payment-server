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
// из соответствующего узла Botpress (BuyThreeCards, AbundancePayment, LovePayment, FatePayment).

// Хелпер: короткая фраза-модификатор в зависимости от положения карты
function orientationTone(card) {
  return card.isReversed
    ? { verb: "предупреждает", tone: "требует переосмысления" }
    : { verb: "показывает", tone: "разворачивается благоприятно" };
}

// Хелпер: случайный выбор одного шаблона из массива
function pickTemplate(templates, cardsDrawn) {
  const fn = templates[Math.floor(Math.random() * templates.length)];
  return fn(cardsDrawn);
}

const SPREADS = {
  three_cards: {
    title: "✨ РАСКЛАД «ТРИ КАРТЫ»",
    subtitle: "Погружение в потоки времени",
    positions: [
      { label: "ПРОШЛОЕ — что привело тебя сюда", emoji: "🕰️" },
      { label: "НАСТОЯЩЕЕ — твоя текущая точка силы", emoji: "🔮" },
      { label: "БУДУЩЕЕ — куда ведёт твой путь", emoji: "🌟" }
    ],
    buildFinalMessage: (c) => pickTemplate([
      (c) => {
        const t0 = orientationTone(c[0]), t1 = orientationTone(c[1]), t2 = orientationTone(c[2]);
        return `Карта «${c[0].name}» ${t0.verb}, что привело тебя к текущей точке — этот сюжет ${t0.tone}. ` +
          `Сейчас «${c[1].name}» ${t1.verb} состояние, которое ${t1.tone} прямо сейчас. ` +
          `А «${c[2].name}» ${t2.verb} направление, куда ведёт твой путь: оно ${t2.tone}.`;
      },
      (c) => {
        const t2 = orientationTone(c[2]);
        return `Твой путь начался с энергии «${c[0].name}» — именно она заложила основу происходящего. ` +
          `${c[1].isReversed ? "Сейчас ты застрял между тем, что было, и тем, что будет — карта" : "Сейчас всё сходится в фокус —"} «${c[1].name}» ` +
          `${c[1].isReversed ? "просит остановиться и честно посмотреть на ситуацию." : "показывает, где ты находишься по-настоящему."} ` +
          `Финал этой истории ${t2.tone} через «${c[2].name}».`;
      },
      (c) => {
        return `Три карты сложились в единый сюжет. «${c[0].name}» — это фундамент, на котором стоит настоящее. ` +
          `«${c[1].name}» — зеркало твоего текущего состояния, ${c[1].isReversed ? "которое просит внимания и паузы" : "полное силы для действия"}. ` +
          `А «${c[2].name}» — это не приговор, а направление: ${c[2].isReversed ? "путь пока петляет, но выбор за тобой" : "дорога открыта, если ты продолжишь идти"}.`;
      }
    ], c)
  },

  abundance: {
    title: "💰 РАСКЛАД «АБУНДАНС»",
    subtitle: "Поток изобилия и финансовая энергия",
    positions: [
      { label: "ТЕКУЩИЙ ДЕНЕЖНЫЙ ПОТОК — где ты сейчас", emoji: "💵" },
      { label: "ЧТО БЛОКИРУЕТ ИЗОБИЛИЕ", emoji: "🔒" },
      { label: "ПОТЕНЦИАЛ РОСТА — куда двигаться", emoji: "🌱" }
    ],
    buildFinalMessage: (c) => pickTemplate([
      (c) => {
        return `Карта «${c[0].name}» отражает твою нынешнюю денежную энергию — ${c[0].isReversed ? "она пока в застое" : "и в ней уже есть движение"}. ` +
          `«${c[1].name}» указывает на то, что сдерживает поток: ${c[1].isReversed ? "блок слабее, чем кажется" : "это реальное препятствие, с которым стоит поработать"}. ` +
          `А «${c[2].name}» показывает, куда направить усилия, чтобы открыть изобилие.`;
      },
      (c) => {
        return `Финансовая история сейчас звучит так: у истоков — «${c[0].name}», ${c[0].isReversed ? "энергия, которая утекает мимо тебя" : "стабильная почва под ногами"}. ` +
          `Главная преграда — «${c[1].name}»: ${c[1].advice} ` +
          `Рост возможен через «${c[2].name}» — именно там сейчас точка силы.`;
      },
      (c) => {
        return `Деньги — это тоже энергия, и сейчас она проходит через три состояния. ` +
          `«${c[0].name}» — твоя точка старта. «${c[1].name}» — узел, который держит поток ${c[1].isReversed ? "не так крепко, как ты думаешь" : "довольно крепко"}. ` +
          `«${c[2].name}» — выход из этого узла, направление, куда стоит вложить внимание и ресурсы.`;
      }
    ], c)
  },

  love: {
    title: "💞 РАСКЛАД «НИТИ ЛЮБВИ»",
    subtitle: "Связь сердец и энергия отношений",
    positions: [
      { label: "ТЫ — твои чувства и роль в отношениях", emoji: "💗" },
      { label: "ПАРТНЁР — его энергия и позиция", emoji: "💘" },
      { label: "СВЯЗЬ — что происходит между вами", emoji: "🔗" }
    ],
    buildFinalMessage: (c) => pickTemplate([
      (c) => {
        return `Карта «${c[0].name}» раскрывает твои чувства и то, что ты вкладываешь в отношения. ` +
          `«${c[1].name}» говорит об энергии партнёра — ${c[1].isReversed ? "она сейчас закрыта или противоречива" : "она открыта и направлена в твою сторону"}. ` +
          `А «${c[2].name}» показывает саму нить, которая связывает вас двоих.`;
      },
      (c) => {
        return `Ты приходишь в эту связь с энергией «${c[0].name}» — ${c[0].isReversed ? "с тревогой или незакрытым вопросом" : "с открытым сердцем"}. ` +
          `Партнёр отвечает через «${c[1].name}»: ${c[1].advice} ` +
          `Между вами звучит «${c[2].name}» — ${c[2].isReversed ? "связь сейчас требует честного разговора" : "связь, в которой есть настоящий резонанс"}.`;
      },
      (c) => {
        return `Три карты — три грани одной истории любви. «${c[0].name}» — это ты в этих отношениях. ` +
          `«${c[1].name}» — зеркало партнёра, ${c[1].isReversed ? "которое пока показывает не всё" : "довольно ясное и честное"}. ` +
          `А «${c[2].name}» — это сама нить между вами, ${c[2].isReversed ? "натянутая, но не разорванная" : "живая и крепкая"}.`;
      }
    ], c)
  },

  // Врата судьбы — 5 карт, отдельная драматургия финального послания
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
    buildFinalMessage: (c) => pickTemplate([
      (c) => {
        return `Ситуация «${c[0].name}» разворачивается под скрытым влиянием «${c[1].name}» — ${c[1].isReversed ? "силой, которую ты пока не осознаёшь до конца" : "энергией, которая действует в твою пользу, даже если это незаметно"}. ` +
          `Препятствие «${c[2].name}» проверяет тебя на прочность, но совет карты «${c[3].name}» указывает путь: ${c[3].advice} ` +
          `Врата судьбы открываются к «${c[4].name}» — ${c[4].isReversed ? "и этот итог ещё можно изменить, если прислушаться к совету" : "и это направление уже начало формироваться"}.`;
      },
      (c) => {
        return `Пять карт складываются в арку одной судьбы. Всё начинается с «${c[0].name}» — сути того, что происходит с тобой сейчас. ` +
          `Позади этого стоит «${c[1].name}», незримая сила, ${c[1].isReversed ? "которая пока скрыта от тебя" : "которая уже направляет события"}. ` +
          `На пути встаёт «${c[2].name}» — испытание, которое нельзя обойти, только пройти. ` +
          `Карта совета «${c[3].name}» шепчет: ${c[3].advice} ` +
          `И если ты услышишь этот совет, врата откроются к «${c[4].name}».`;
      },
      (c) => {
        return `Это расклад о переходе — от одного состояния к другому. ` +
          `«${c[0].name}» — точка, где ты стоишь. «${c[1].name}» — то, что тянет тебя незримо, ${c[1].isReversed ? "чаще из тени, чем в открытую" : "и это влияние довольно сильное"}. ` +
          `«${c[2].name}» — стена, которую предстоит пройти. Но у тебя есть ключ — «${c[3].name}»: ${c[3].advice} ` +
          `И тогда за вратами будет ждать «${c[4].name}» — ${c[4].isReversed ? "итог, который ещё не высечен в камне" : "итог, к которому ты уже приближаешься"}.`;
      }
    ], c)
  }
};

// ==================== ТАРО: генерация расклада без LLM ====================

function drawCards(count) {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(card => ({
    ...card,
    isReversed: Math.random() < 0.5
  }));
}

function cardCaption(card, positionLabel, positionEmoji) {
  const orientation = card.isReversed ? "🔄 Перевёрнутое положение" : "✨ Прямое положение";
  const meaning = card.isReversed ? card.reversed : card.upright;
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

// ==================== РЕЕСТР ПОЛЬЗОВАТЕЛЕЙ (для напоминаний) ====================

async function upsertBotUser(userId, chatId) {
  if (!userId || !chatId) return;
  const { error } = await supabase
    .from("bot_users")
    .upsert({ user_id: userId, chat_id: chatId, last_seen: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("BOT USER UPSERT ERROR:", error);
  }
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
    await upsertBotUser(user_id, chat_id);

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

// ==================== КАРТА ДНЯ ====================

function getTodayDateMoscow() {
  // Формат YYYY-MM-DD в московском часовом поясе — чтобы "день" не сбивался из-за UTC на сервере
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
}

async function sendDailyCardMessage(chatId, card, alreadyDrawn) {
  const orientation = card.is_reversed ? "🔄 Перевёрнутое положение" : "✨ Прямое положение";

  const header = alreadyDrawn
    ? "🎴 Ты уже вытянул(а) карту дня сегодня — вот она снова:"
    : "🎴 ТВОЯ КАРТА ДНЯ";

  const text =
    `${header}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎴 ${card.card_name}\n` +
    `${orientation}\n\n` +
    `💫 ${card.card_meaning}\n\n` +
    `🔑 Совет: ${card.card_advice}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔄 Возвращайся завтра за новой картой`;

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: card.card_image,
      caption: text
    })
  });
}

app.post("/daily-card", async (req, res) => {
  try {
    const { user_id, chat_id } = req.body;
    console.log("=== DAILY CARD REQUEST ===", user_id, chat_id);

    if (!user_id || !chat_id) {
      return res.status(400).json({ error: "user_id and chat_id required" });
    }

    await upsertBotUser(user_id, chat_id);

    const today = getTodayDateMoscow();

    // Проверяем, была ли уже выдана карта сегодня
    const { data: existing, error: selectError } = await supabase
      .from("daily_cards")
      .select("*")
      .eq("user_id", user_id)
      .eq("drawn_date", today)
      .maybeSingle();

    if (selectError) {
      console.error("DAILY CARD SELECT ERROR:", selectError);
      return res.status(500).json({ error: "Failed to check daily card" });
    }

    if (existing) {
      console.log("DAILY CARD ALREADY DRAWN TODAY:", user_id);
      await sendDailyCardMessage(chat_id, existing, true);
      return res.json({ ok: true, alreadyDrawn: true, card: existing.card_name });
    }

    // Новая карта дня
    const drawn = drawCards(1)[0];
    const newCard = {
      user_id,
      chat_id,
      card_name: drawn.name,
      card_image: drawn.image,
      card_meaning: drawn.isReversed ? drawn.reversed : drawn.upright,
      card_advice: drawn.advice,
      is_reversed: drawn.isReversed,
      drawn_date: today
    };

    const { error: insertError } = await supabase
      .from("daily_cards")
      .insert(newCard);

    if (insertError) {
      // Если гонка (два запроса почти одновременно) — уникальный индекс мог сработать первым
      console.error("DAILY CARD INSERT ERROR:", insertError);
      return res.status(500).json({ error: "Failed to save daily card" });
    }

    console.log("DAILY CARD SAVED:", user_id, newCard.card_name);
    await sendDailyCardMessage(chat_id, newCard, false);
    res.json({ ok: true, alreadyDrawn: false, card: newCard.card_name });

  } catch (error) {
    console.error("DAILY CARD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== НАПОМИНАНИЯ ====================

app.post("/send-reminders", async (req, res) => {
  try {
    const secret = req.query.secret || req.headers["x-reminder-secret"];
    if (secret !== process.env.REMINDER_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("=== SEND REMINDERS START ===");

    const today = getTodayDateMoscow();

    const { data: allUsers, error: usersError } = await supabase
      .from("bot_users")
      .select("user_id, chat_id");

    if (usersError) {
      console.error("REMINDERS: FETCH USERS ERROR:", usersError);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    const { data: drawnToday, error: drawnError } = await supabase
      .from("daily_cards")
      .select("user_id")
      .eq("drawn_date", today);

    if (drawnError) {
      console.error("REMINDERS: FETCH DRAWN ERROR:", drawnError);
      return res.status(500).json({ error: "Failed to fetch drawn cards" });
    }

    const drawnUserIds = new Set((drawnToday || []).map(r => r.user_id));
    const toRemind = (allUsers || []).filter(u => !drawnUserIds.has(u.user_id));

    console.log(`REMINDERS: total users ${allUsers.length}, already drawn ${drawnUserIds.size}, to remind ${toRemind.length}`);

    let sent = 0;
    for (const user of toRemind) {
      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: user.chat_id,
            text: "🔮 Твоя карта дня уже ждёт тебя! Загляни в бот и узнай, что подготовила вселенная сегодня 🎴",
            reply_markup: {
              inline_keyboard: [[{ text: "🎴 Получить карту дня", url: "https://t.me/arcana_cards_bot?start=menu" }]]
            }
          })
        });
        sent++;
      } catch (tgError) {
        console.error("REMINDER SEND FAILED for", user.chat_id, tgError);
      }
      // небольшая пауза, чтобы не упереться в лимиты Telegram
      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`=== SEND REMINDERS DONE: ${sent}/${toRemind.length} sent ===`);
    res.json({ ok: true, totalUsers: allUsers.length, alreadyDrawn: drawnUserIds.size, reminded: sent });

  } catch (error) {
    console.error("SEND REMINDERS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});