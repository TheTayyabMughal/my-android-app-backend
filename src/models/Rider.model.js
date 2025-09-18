import mongoose, { Schema, model } from "mongoose";


const Riderschema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address:{
        type: String,
      required: true,
    },
    phoneNo:{
        type: String,
        required: true,
    },
    // profilePic:{
    //   type:String,
    // },
    serviceProvider: 
      {
        type: Schema.Types.ObjectId,
        ref: "ServiceProviders",
        required: true,
      }
    
  },
  { timestamps: true }
);


export const Riders = mongoose.model("Riders", Riderschema);