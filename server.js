const express = require("express");
const cors = require("cors");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const payments = {};


// проверка
app.get("/", (req, res) => {
  res.send("OK");
});


// создание платежа
app.post("/create-payment", async (req, res) => {

  try {

    console.log("=== CREATE PAYMENT REQUEST ===");
    console.log(req.body);


    const {
      amount,
      description,
      user_id,
      chat_id,
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
        "https://t.me/arcana_cards_bot"

      },


      capture: true,


      description,


      receipt: {

        customer: {

          email: "test@example.com"

        },

        items: [

          {

            description,

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



    payments[payment.id] = {

      user_id,

      chat_id,

      product,

      status: "pending"

    };


    console.log("SAVED PAYMENT:");
    console.log(payments[payment.id]);


    res.json(payment);


  } catch(error){

    console.error(error);

    res.status(500).json({

      error:error.message

    });

  }

});



// webhook YooKassa
app.post("/yookassa/webhook", async (req,res)=>{


  console.log("=== YOOKASSA WEBHOOK ===");

  console.log(
    JSON.stringify(req.body,null,2)
  );


  const event=req.body;


  if(event.event==="payment.succeeded"){


    const paymentId=event.object.id;


    console.log(
      "SUCCESS PAYMENT:",
      paymentId
    );


    const payment=payments[paymentId];


    if(payment){


      payment.status="paid";


      console.log(
        "PAYMENT UPDATED:"
      );

      console.log(payment);



      if(payment.chat_id){


        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
          {

            method:"POST",

            headers:{
              "Content-Type":"application/json"
            },

            body:JSON.stringify({

              chat_id: payment.chat_id,

              text:
              "🔮 Оплата получена!\n\nВаш расклад «Три карты» готов."

            })

          }

        );


        console.log(
          "MESSAGE SENT TO TELEGRAM"
        );


      } else {


        console.log(
          "NO CHAT ID"
        );


      }


    }


  }


  res.sendStatus(200);

});


// проверка оплаты
app.get("/check-payment",(req,res)=>{


 const userId=req.query.user_id;


 const payment=
 Object.values(payments)
 .find(
  p=>p.user_id===userId
 );


 if(!payment){

  return res.json({
    paid:false
  });

 }


 res.json({

  paid:payment.status==="paid",

  product:payment.product

 });


});



const PORT=process.env.PORT||3000;


app.listen(PORT,()=>{

 console.log(
  `Server running on port ${PORT}`
 );

});