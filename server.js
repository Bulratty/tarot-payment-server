const express = require("express");
const cors = require("cors");
const { YooCheckout, CurrencyEnum } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Проверка что сервер жив
app.get("/", (req, res) => {
  res.send("OK");
});

// Создание платежа YooKassa
app.post("/create-payment", async (req, res) => {
  try {
    console.log("CREATE PAYMENT REQUEST:");
    console.log(req.body);

    const { amount, description } = req.body;

    const yooCheckout = new YooCheckout({
      shopId: process.env.YOOKASSA_SHOP_ID,
      secretKey: process.env.YOOKASSA_SECRET_KEY
    });

    const payment = await yooCheckout.createPayment({
      amount: {
        value: amount,
        currency: CurrencyEnum.RUB
      },
      confirmation: {
        type: "redirect",
        return_url: "https://studio.botpress.cloud"
      },
      capture: true,
      description: description || "Оплата расклада Таро"
    });

    console.log("PAYMENT CREATED:");
    console.log(payment.id);

    res.json(payment);

  } catch (error) {
    console.error("PAYMENT ERROR:");

    if (error.response) {
      console.error(error.response.data);
      return res.status(400).json(error.response.data);
    }

    console.error(error.message);
    res.status(500).json({
      error: error.message
    });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
