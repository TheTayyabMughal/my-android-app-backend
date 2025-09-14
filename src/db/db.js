import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"
import { initializeServices } from "../utils/initDb.js";

const connectDB=async()=>{
    try {
        const connectioninstance=await mongoose.connect(`${process.env.MONGODB_URI}`)
        await initializeServices();
    console.log(`\n mongodb connected successfully`);
    } catch (error) {
        console.log("Error : ",err);
        process.exit(1);   
    }
}
export default connectDB;