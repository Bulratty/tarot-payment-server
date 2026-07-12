const express = require("express");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("OK");
});


const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});


app.post("/create-payment", async (req, res) => {

  console.log("VERSION TEST: PAYMENT SUBJECT FIX 3");

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


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
