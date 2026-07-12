const express = require("express");
const axios = require("axios");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(express.json());


// Проверка сервера
app.get("/", (req, res) => {
  res.send("OK");
});


// ЮKassa
const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});


// Создание платежа
app.post("/create-payment", async (req, res) => {

  console.log("CREATE PAYMENT REQUEST:");
  console.log(req.body);

  try {

    const { amount, description } = req.body;


    const payment = await checkout.createPayment({

      amount: {
        value: String(amount),
        currency: "RUB"
      },

      confirmation: {
        type: "redirect",
        return_url: "https://example.com"
      },

      capture: true,

      description: description || "Расклад Таро",

      receipt: {
        customer: {
          email: "test@example.com"
        },

        items: [
          {
            description: description || "Расклад Таро",

            quantity: "1",

            amount: {
              value: String(amount),
              currency: "RUB"
            },

            vat_code: 1,

            payment_subject: "service",

            payment_mode: "full_payment"
          }
        ]
      },

      metadata: {
        product: description || "tarot"
      }

    });


    console.log("PAYMENT CREATED");
    console.log(payment);


    res.json({
      success: true,
      id: payment.id,
      url: payment.confirmation.confirmation_url
    });


  } catch (error) {

    console.log("PAYMENT ERROR");
    console.log(error.response?.data || error);

    res.status(500).json({
      success: false,
      details: error.response?.data || error
    });

  }

});



// Webhook ЮKassa
app.post("/yookassa-webhook", async (req, res) => {

  console.log("YOOKASSA WEBHOOK:");
  console.log(req.body);


  try {

    const event = req.body;


    if (
      event.event === "payment.succeeded"
    ) {

      const payment = event.object;


      await axios.post(
        "https://webhook.botpress.cloud/2d2c172a-4e79-475e-bb7f-c70ecfd19d11",
        {
          event: "payment_success",
          payment_id: payment.id,
          amount: payment.amount.value,
          product: payment.metadata?.product
        }
      );


      console.log("SENT TO BOTPRESS");

    }


    res.sendStatus(200);


  } catch (error) {

    console.log("WEBHOOK ERROR:");
    console.log(error.message);

    res.sendStatus(500);

  }

});



// Запуск
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
