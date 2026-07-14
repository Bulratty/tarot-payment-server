const express = require("express");
const cors = require("cors");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


// временное хранилище платежей
const payments = {};


// ===============================
// ПРОВЕРКА СЕРВЕРА
// ===============================

app.get("/", (req, res) => {
  res.send("OK");
});


// ===============================
// СОЗДАНИЕ ПЛАТЕЖА YOOKASSA
// ===============================

app.post("/create-payment", async (req, res) => {

  try {

    console.log("=== CREATE PAYMENT REQUEST ===");
    console.log(req.body);


    const {
      amount,
      description,
      user_id,
      product
    } = req.body;



    const yooCheckout = new YooCheckout({

      shopId: process.env.YOOKASSA_SHOP_ID,

      secretKey: process.env.YOOKASSA_SECRET_KEY

    });



    const payment = await yooCheckout.createPayment({

      amount: {

        value: amount,

        currency: "RUB"

      },


      confirmation: {

        type: "redirect",

        return_url:
        "https://t.me/arcana_cards_bot?start=payment_success"

      },


      capture: true,


      description:
      description || "Оплата расклада Таро",



      receipt: {

        customer: {

          email: "test@example.com"

        },


        items: [

          {

            description:
            description || "Расклад Таро",


            quantity: 1,


            amount: {

              value: amount,

              currency: "RUB"

            },


            vat_code: 1,


            payment_subject: "service",


            payment_mode: "full_payment"

          }

        ]

      }


    });



    console.log("PAYMENT CREATED:");
    console.log(payment);



    // сохраняем платеж

    payments[payment.id] = {

      user_id: user_id,

      product: product,

      status: "pending"

    };



    console.log("SAVED PAYMENT:");

    console.log(payments[payment.id]);



    res.json(payment);



  } catch(error) {


    console.error("PAYMENT ERROR:");



    if(error.response){

      console.error(error.response.data);

      return res
      .status(400)
      .json(error.response.data);

    }



    console.error(error.message);



    res.status(500).json({

      error: error.message

    });


  }

});



// ===============================
// WEBHOOK YOOKASSA
// ===============================

app.post("/yookassa/webhook", (req, res) => {


  console.log("=== YOOKASSA WEBHOOK ===");


  console.log(
    JSON.stringify(req.body, null, 2)
  );



  const event = req.body;



  if(event.event === "payment.succeeded"){


    const paymentId =
    event.object.id;



    console.log(
      "SUCCESS PAYMENT:",
      paymentId
    );



    if(payments[paymentId]){


      payments[paymentId].status =
      "paid";



      console.log(
        "PAYMENT UPDATED:"
      );


      console.log(
        payments[paymentId]
      );



    } else {


      console.log(
        "PAYMENT NOT FOUND IN MEMORY"
      );


    }


  }



  res.sendStatus(200);


});



// ===============================
// ПРОВЕРКА ОПЛАТЫ ДЛЯ BOTPRESS
// ===============================

app.get("/check-payment", (req, res) => {


  const userId =
  req.query.user_id;



  console.log("=== CHECK PAYMENT ===");


  console.log(
    "USER ID:",
    userId
  );



  const payment =
  Object.values(payments)
  .find(
    item =>
    item.user_id === userId
  );



  if(!payment){


    console.log(
      "PAYMENT NOT FOUND"
    );


    return res.json({

      paid: false

    });


  }



  console.log(
    "FOUND PAYMENT:"
  );


  console.log(payment);



  res.json({

    paid:
    payment.status === "paid",

    product:
    payment.product

  });


});



// ===============================
// ЗАПУСК СЕРВЕРА
// ===============================

const PORT =
process.env.PORT || 3000;



app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});