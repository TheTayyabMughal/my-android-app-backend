import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"
import { initializeServices } from "../utils/InitDb.js";

const connectDB=async()=>{
    try {
        const connectioninstance=await mongoose.connect(`${process.env.MONGODB_URI}`)
     // await mongoose.connection.dropDatabase();
        await initializeServices();
    } catch (error) {
        process.exit(1);   
    }
}
export default connectDB;