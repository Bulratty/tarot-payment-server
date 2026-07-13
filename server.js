const express = require("express");
const { YooCheckout } = require("@a2seven/yoo-checkout");
require("dotenv").config();

const app = express();

app.use(express.json());


const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});


const BOTPRESS_WEBHOOK_URL =
"https://webhook.botpress.cloud/0fe328bd-23b3-4fd3-b459-2287f9bb989c";



app.get("/", (req,res)=>{
  res.send("OK");
});




// CREATE PAYMENT

app.post("/create-payment", async (req,res)=>{


console.log("===== CREATE PAYMENT =====");
console.log(JSON.stringify(req.body,null,2));


try {


const {
amount,
description,
user_id,
product
}=req.body;



const payment = await checkout.createPayment({


amount:{
value: amount || "1.00",
currency:"RUB"
},


confirmation:{
type:"redirect",
return_url:"https://t.me/your_bot"
},


capture:true,


description:
description || "Расклад Таро",



receipt:{


customer:{
email:"test@example.com"
},



items:[

{

description:
description || "Расклад Таро",


quantity:"1",


amount:{
value: amount || "1.00",
currency:"RUB"
},


// ВАЖНО ДЛЯ 54-ФЗ
vat_code:1,


payment_subject:"service",


payment_mode:"full_payment"

}

]


},



metadata:{


user_id:user_id,

product:product


}



});



console.log("===== PAYMENT CREATED =====");
console.log(JSON.stringify(payment,null,2));


res.json(payment);



}
catch(error){


console.error("===== PAYMENT ERROR =====");

console.error(
error.response?.data || error
);



res.status(500).json({

error:"payment_creation_failed",

details:error.response?.data || error.message

});


}


});






// YOOKASSA WEBHOOK

app.post("/yookassa-webhook",async(req,res)=>{


console.log("===== YOOKASSA WEBHOOK =====");

console.log(JSON.stringify(req.body,null,2));



try{


if(req.body.event==="payment.succeeded"){


const payment=req.body.object;


await fetch(
BOTPRESS_WEBHOOK_URL,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

user_id:
payment.metadata.user_id,

product:
payment.metadata.product,

payment_id:
payment.id

})


});


console.log("SENT TO BOTPRESS");


}



res.send("OK");


}
catch(error){

console.error(error);

res.status(500).send("ERROR");

}


});




const PORT=process.env.PORT || 3000;


app.listen(PORT,()=>{

console.log(
"Server running on port "+PORT
);

});
