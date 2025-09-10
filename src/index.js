import dotenv from "dotenv"
import connectDB from "../src/db/db.js"
import { app } from "./app.js"


dotenv.config({path:"./env"});


connectDB().then(
    // app.listen(process.env.PORT||8081,'0.0.0.0',()=>{
    app.listen(3000,'0.0.0.0',()=>{
       
        console.log(`Server running on port : ${process.env.PORT}`)
    })
).catch((err)=>{
    console.log("MongoDB connection failed !!!",err)
})
