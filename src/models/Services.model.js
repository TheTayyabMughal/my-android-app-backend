import mongoose, { Schema, model } from "mongoose";


const ServicesSchema = new Schema(
  {
    name:{
        type:String,
        required:true,
    }
  },
  { timestamps: true }
);


export const Services = mongoose.model("Services", ServicesSchema);