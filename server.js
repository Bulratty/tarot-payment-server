const express = require("express");

const app = express();

// важно: парсер JSON для ЮKassa webhook
app.use(express.json());

// проверка что сервер жив
app.get("/", (req, res) => {
  res.send("OK");
});

// webhook для ЮKassa
app.post("/webhook", (req, res) => {
  console.log("Webhook received:", req.body);

  // сюда позже добавим:
  // - проверку платежа
  // - выдачу доступа в Botpress

  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
