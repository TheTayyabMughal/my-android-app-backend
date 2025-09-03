import mongoose, { Schema, model } from "mongoose";


const Riderschema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    CNIC:{
        type: String,
      required: true,
      unique: true,
    },
    phoneNo:{
        type: String,
        required: true,
    },
    profilePic:{
      type:String,
    },
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