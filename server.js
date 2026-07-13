const express = require("express");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(express.json());


const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});


// Проверка сервера
app.get("/", (req, res) => {
  res.send("OK");
});


// Создание платежа
app.post("/create-payment", async (req, res) => {

  console.log("===== CREATE PAYMENT =====");
  console.log(JSON.stringify(req.body, null, 2));


  try {

    const {
      amount,
      description,
      user_id,
      product
    } = req.body;


    const payment = await checkout.createPayment({

      amount: {
        value: amount || "1.00",
        currency: "RUB"
      },


      confirmation: {
        type: "redirect",
        return_url: "https://t.me/your_bot"
      },


      capture: true,


      description:
      description || "Расклад Таро",


      receipt: {

        customer: {

          email: "test@example.com"

        },


        items: [

          {

            description:
            description || "Расклад Таро",


            quantity: "1",


            amount: {

              value: amount || "1.00",

              currency: "RUB"

            },


            vat_code: 1


          }

        ]

      },


      metadata: {

        user_id:
        user_id || "unknown",


        product:
        product || "unknown"

      }

    });



    console.log("===== PAYMENT CREATED =====");

    console.log(
      JSON.stringify(payment, null, 2)
    );


    res.json(payment);


  } catch(error) {


    console.error("===== CREATE PAYMENT ERROR =====");

    console.error(error);


    res.status(500).json({

      error:
      "payment_creation_failed",

      message:
      error.message,

      details:
      error.response?.data || null

    });

  }

});



// Webhook ЮKassa
app.post("/yookassa-webhook", async (req,res)=>{


  console.log("===== YOOKASSA WEBHOOK =====");

  console.log(
    JSON.stringify(req.body,null,2)
  );


  res.send("OK");

});



const PORT =
process.env.PORT || 3000;


app.listen(PORT,()=>{

  console.log(
    "Server running on port " + PORT
  );

});
