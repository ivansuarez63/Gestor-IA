export default async function handler(req,res){


try{


const mensaje =
req.body.mensaje;



const respuesta =
await fetch(
"https://api.openai.com/v1/chat/completions",
{


method:"POST",


headers:{

"Content-Type":"application/json",

"Authorization":
"Bearer "+process.env.OPENAI_API_KEY

},



body:JSON.stringify({


model:"gpt-4.1-mini",


messages:[


{
role:"system",
content:"Eres Gestor-IA, asistente experto."
},


{
role:"user",
content:mensaje
}


]


})


});



const datos =
await respuesta.json();



res.json({

respuesta:
datos.choices[0].message.content

});



}

catch(e){


res.status(500).json({

respuesta:"Error de conexión con IA"

});


}


}