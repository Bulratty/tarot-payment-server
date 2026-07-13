const express = require("express");

const app = express();

app.use(express.json());


// Проверка сервера
app.get("/", (req, res) => {
  res.send("OK");
});


// ЮKassa webhook
app.post("/yookassa-webhook", async (req, res) => {

  try {

    console.log("===== YOOKASSA WEBHOOK =====");
    console.log(JSON.stringify(req.body, null, 2));


    const event = req.body;


    if (event.event !== "payment.succeeded") {
      console.log("Не успешная оплата");
      return res.send("OK");
    }


    const payment = event.object;


    const product = payment.metadata?.product;
    const userId = payment.metadata?.user_id;


    console.log("===== PAYMENT DATA =====");
    console.log("Payment ID:", payment.id);
    console.log("Amount:", payment.amount.value);
    console.log("Product:", product);
    console.log("User ID:", userId);



    if (!userId) {

      console.log("ОШИБКА: нет user_id в metadata");

      return res.send("OK");
    }



    // Отправка события в Botpress

    const botpressResponse = await fetch(
      "https://api.botpress.cloud/v1/chat/events",
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json",

          "Authorization":
            "Bearer bp_bak_Y7BoOzYX4JLHAqJ6Nz9BAhxTch8uvdmBmERi",

          "x-bot-id":
            "081ebf8e-7639-489f-b02c-9e6db793b4c6"
        },


        body: JSON.stringify({

          type: "payment_success",

          userId: userId,

          payload: {

            product: product,

            paymentId: payment.id,

            amount: payment.amount.value

          }

        })

      }
    );


    const result = await botpressResponse.text();


    console.log("===== BOTPRESS RESPONSE =====");
    console.log(result);



    res.send("OK");


  } catch (error) {


    console.error("WEBHOOK ERROR:");
    console.error(error);


    res.status(500).send("ERROR");

  }

});



// Запуск

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
