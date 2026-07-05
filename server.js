const express = require('express')
const axios = require('axios')
const fs = require('fs')

const app = express()

app.use(express.json())

const BOT_TOKEN = process.env.BOT_TOKEN
const BOTPRESS_WEBHOOK = process.env.BOTPRESS_WEBHOOK
const SHOP_ID = process.env.SHOP_ID
const SECRET_KEY = process.env.SECRET_KEY

const paymentsFile = './data/payments.json'

function savePayment(id, spread) {
  let data = {}

  if (fs.existsSync(paymentsFile)) {
    data = JSON.parse(fs.readFileSync(paymentsFile))
  }

  data[id] = spread

  fs.writeFileSync(paymentsFile, JSON.stringify(data, null, 2))
}

function getPayment(id) {
  if (!fs.existsSync(paymentsFile)) return null

  const data = JSON.parse(fs.readFileSync(paymentsFile))

  return data[id]
}

app.post('/create-payment', async (req, res) => {

  const { chatId, spread, amount } = req.body

  try {

    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount: {
          value: amount,
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: 'https://t.me/arcana_cards_bot'
        },
        capture: true,
        description: spread,
        metadata: {
          chatId
        }
      },
      {
        auth: {
          username: SHOP_ID,
          password: SECRET_KEY
        },
        headers: {
          'Idempotence-Key': Date.now().toString()
        }
      }
    )

    savePayment(response.data.id, spread)

    res.json({
      url: response.data.confirmation.confirmation_url
    })

  } catch (e) {

    console.log(e.response?.data || e)

    res.status(500).send('error')

  }

})

app.post('/yookassa-webhook', async (req, res) => {

  const event = req.body

  if (
    event.event === 'payment.succeeded'
  ) {

    const payment = event.object

    const spread = getPayment(payment.id)

    const chatId = payment.metadata.chatId

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: `/paid_${spread}`
      }
    )

  }

  res.sendStatus(200)

})

app.listen(process.env.PORT || 3000)
