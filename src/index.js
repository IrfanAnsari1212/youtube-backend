// require("dotenv").config({path: "./.env"});

import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config();



connectDB();














/*
import express from "express";
const app = express();

( async ()=>{
    try {
         await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
         app.on("error", (err)=>{
             console.error("ERROR", err);
                throw err
         })

            app.listen(process.env.PORT, ()=>{
                console.log(`Server is running on port ${process.env.PORT}`);
            })
        
    } catch (err) {
        console.error("ERROR", err);
        throw err;
    }
})()

*/