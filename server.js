const express = require("express");

const app = express();

// Парсер JSON для webhook ЮKassa
app.use(express.json());

// Проверка сервера
app.get("/", (req, res) => {
  res.send("OK");
});


// Webhook ЮKassa
app.post("/yookassa-webhook", async (req, res) => {
  try {
    console.log("=== YOOKASSA WEBHOOK RECEIVED ===");
    console.log(JSON.stringify(req.body, null, 2));

    const event = req.body;

    // Проверяем успешную оплату
    if (event.event === "payment.succeeded") {

      const payment = event.object;

      const product = payment.metadata?.product;
      const userId = payment.metadata?.user_id;

      console.log("Payment success");
      console.log("Product:", product);
      console.log("User ID:", userId);


      // Отправляем событие в Botpress
      if (userId) {

        const response = await fetch(
          "https://your-botpress-url/api/v1/bots/your-bot-id/events",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer YOUR_BOTPRESS_TOKEN"
            },
            body: JSON.stringify({
              type: "payment_success",
              userId: userId,
              payload: {
                product: product
              }
            })
          }
        );

        console.log(
          "Botpress response:",
          await response.text()
        );

      } else {
        console.log("No user_id in metadata");
      }
    }


    res.send("OK");

  } catch (error) {

    console.error("Webhook error:");
    console.error(error);

    res.status(500).send("ERROR");
  }
});


// Запуск сервера
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
