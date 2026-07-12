const express = require("express");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(express.json());


// Проверка сервера
app.get("/", (req, res) => {
  res.send("OK");
});


// Подключение ЮKassa
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


      description: description || "Оплата расклада Таро",


      receipt: {
        customer: {
          email: "test@example.com"
        },

        items: [
          {
            description: description || "Расклад Таро",

            quantity: "1.00",

            amount: {
              value: String(amount),
              currency: "RUB"
            },

            vat_code: 1,

            paymentSubject: "service"
          }
        ]
      }

    });


    console.log("PAYMENT CREATED:");
    console.log(payment);


    res.json({
      success: true,
      id: payment.id,
      status: payment.status,
      confirmation_url: payment.confirmation.confirmation_url
    });


  } catch (error) {

    console.log("========== PAYMENT ERROR ==========");
    console.log(error.response?.data || error);
    console.log("===================================");


    res.status(500).json({
      success: false,
      message: error.message || "Payment error",
      details: error.response?.data || error
    });

  }

});


// Запуск сервера
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});