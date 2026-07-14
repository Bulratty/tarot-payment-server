const express = require("express");
const crypto = require("crypto");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(express.json());


// =====================
// Проверка сервера
// =====================

app.get("/", (req, res) => {
    res.send("OK");
});


// =====================
// Возврат после оплаты
// =====================

app.get("/payment-success", (req, res) => {

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Оплата успешна</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding-top: 50px;
                }
                a {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 15px 25px;
                    background: #0088cc;
                    color: white;
                    text-decoration: none;
                    border-radius: 10px;
                }
            </style>
        </head>

        <body>

            <h2>✅ Оплата прошла успешно</h2>

            <p>
            Вернитесь в Telegram к боту.
            </p>

            <a href="https://t.me/arcana_cards_bot">
                Открыть Telegram
            </a>

        </body>
        </html>
    `);

});



// =====================
// YooKassa
// =====================

const checkout = new YooCheckout({

    shopId: process.env.YOOKASSA_SHOP_ID,

    secretKey: process.env.YOOKASSA_SECRET_KEY

});



// =====================
// Создание платежа
// =====================

app.post("/create-payment", async (req, res) => {

    try {


        const payment = {

            amount: {

                value: "1.00",

                currency: "RUB"

            },


            confirmation: {

                type: "redirect",

                // ВАЖНО:
                // больше НЕ возвращаем в Telegram /start

                return_url:
                "https://tarot-payment-server-1.onrender.com/payment-success"

            },


            capture: true,


            description:

            "Расклад Таро Три карты",



            receipt: {

                customer: {

                    email:
                    "test@example.com"

                },


                items: [

                    {

                        description:
                        "Расклад Таро Три карты",


                        quantity:
                        "1",


                        amount: {

                            value:
                            "1.00",

                            currency:
                            "RUB"

                        },


                        vat_code:
                        1,


                        payment_subject:
                        "service",


                        payment_mode:
                        "full_payment"

                    }

                ]

            }

        };



        const result = await checkout.createPayment(

            payment,

            {

                idempotenceKey:
                crypto.randomUUID()

            }

        );



        console.log(
            "Payment created:",
            result.id
        );



        // Именно это поле ждёт Botpress

        res.json({

            confirmation_url:
            result.confirmation.confirmation_url

        });



    } catch(error) {


        console.error(
            "Payment error:",
            error
        );


        res.status(500).json({

            error:
            error.message

        });

    }

});



// =====================
// Запуск
// =====================

const PORT =
process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `Server started on port ${PORT}`
    );

});