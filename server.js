const express = require("express");
const YooKassa = require("@a2seven/yoo-checkout").default;
require("dotenv").config();

const app = express();

app.use(express.json());

// проверка сервера
app.get("/", (req, res) => {
  res.send("OK");
});

// создание платежа ЮKassa
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description } = req.body;

    const checkout = new YooKassa({
      shopId: process.env.YOOKASSA_SHOP_ID,
      secretKey: process.env.YOOKASSA_SECRET_KEY,
    });

    const payment = await checkout.createPayment({
      amount: {
        value: amount || "100.00",
        currency: "RUB",
      },
      confirmation: {
        type: "redirect",
        return_url: "https://t.me/",
      },
      capture: true,
      description: description || "Расклад Таро",
    });

    res.json({
      id: payment.id,
      confirmation_url: payment.confirmation.confirmation_url,
    });

  } catch (error) {
    console.error("Payment error:", error.message);
    res.status(500).json({
      error: error.message,
    });
  }
});


// webhook ЮKassa
app.post("/webhook", (req, res) => {
  console.log("Webhook received:", req.body);

  res.status(200).send("OK");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
