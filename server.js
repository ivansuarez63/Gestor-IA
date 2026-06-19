const express = require("express");
const fs = require("fs");

const app = express();

const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));


if(!fs.existsSync("usuarios.json")){
    fs.writeFileSync("usuarios.json","[]");
}


function getUsuarios(){
    return JSON.parse(fs.readFileSync("usuarios.json","utf8"));
}


function saveUsuarios(data){
    fs.writeFileSync(
        "usuarios.json",
        JSON.stringify(data,null,2)
    );
}


// REGISTRO

app.post("/api/registro",(req,res)=>{

    const {nombre,email,password}=req.body;

    let usuarios=getUsuarios();


    let existe=usuarios.find(u =>
        u.nombre.toLowerCase()==nombre.toLowerCase()
        ||
        u.email.toLowerCase()==email.toLowerCase()
    );


    if(existe){
        return res.json({
            ok:false,
            mensaje:"Usuario o correo ya existe"
        });
    }


    usuarios.push({
        nombre,
        email,
        password
    });


    saveUsuarios(usuarios);


    res.json({
        ok:true,
        usuario:nombre
    });

});



// LOGIN

app.post("/api/login",(req,res)=>{


    let usuarios=getUsuarios();


    let usuario=usuarios.find(u =>
        u.email==req.body.email &&
        u.password==req.body.password
    );


    if(!usuario){

        return res.json({
            ok:false,
            mensaje:"Datos incorrectos"
        });

    }


    res.json({
        ok:true,
        usuario:usuario.nombre
    });

});



// OLLAMA

app.post("/api/chat",async(req,res)=>{


try{


let respuesta=await fetch(
"http://127.0.0.1:11434/api/chat",
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

model:"llama3.1",

stream:false,

messages:[

{
role:"system",
content:"Eres Gestor-IA asistente profesional."
},

{
role:"user",
content:req.body.mensaje
}

]

})
});


let datos=await respuesta.json();


res.json({
respuesta:datos.message.content
});


}catch(e){

res.json({
respuesta:"Error conectando con Ollama"
});

}


});




// INICIO

app.listen(PORT,()=>{

console.log("Gestor-IA funcionando");
console.log("http://localhost:"+PORT);

});

});