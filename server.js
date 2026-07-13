const express = require("express");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(express.json());


// ЮKassa клиент

const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});


// Проверка сервера

app.get("/", (req, res) => {
  res.send("OK");
});



// ===============================
// СОЗДАНИЕ ПЛАТЕЖА
// ===============================

app.post("/create-payment", async (req, res) => {

  try {

    console.log("===== CREATE PAYMENT =====");

    console.log(
      JSON.stringify(req.body, null, 2)
    );


    const {
      amount,
      description,
      user_id,
      product
    } = req.body;


    const payment = await checkout.createPayment({

      amount: {

        value: amount || "50.00",

        currency: "RUB"

      },


      confirmation: {

        type: "redirect",

        return_url:
        "https://t.me/your_bot"

      },


      capture: true,


      description:
      description || "Расклад Таро",


      metadata: {

        user_id: user_id,

        product: product

      }

    });


    console.log("PAYMENT CREATED:");

    console.log(
      JSON.stringify(payment, null, 2)
    );


    res.json(payment);


  } catch(error) {


    console.error(
      "CREATE PAYMENT ERROR:"
    );

    console.error(error);


    res.status(500).json({

      error:
      "payment_creation_failed"

    });

  }

});




// ===============================
// WEBHOOK ЮKASSA
// ===============================

app.post("/yookassa-webhook", async (req, res) => {


  try {


    console.log(
      "===== YOOKASSA WEBHOOK ====="
    );


    console.log(
      JSON.stringify(req.body, null, 2)
    );



    const event = req.body;



    if (
      event.event === "payment.succeeded"
    ) {


      const payment = event.object;


      console.log(
        "PAYMENT SUCCESS"
      );


      console.log(
        "ID:",
        payment.id
      );


      console.log(
        "AMOUNT:",
        payment.amount.value
      );


      console.log(
        "PRODUCT:",
        payment.metadata?.product
      );


      console.log(
        "USER:",
        payment.metadata?.user_id
      );


    }



    res.send("OK");



  } catch(error) {


    console.error(
      "WEBHOOK ERROR:"
    );


    console.error(error);


    res.status(500).send("ERROR");


  }


});




// ===============================
// START
// ===============================


const PORT =
process.env.PORT || 3000;


app.listen(PORT, () => {


  console.log(
    `Server running on port ${PORT}`
  );


});
