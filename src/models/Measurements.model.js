import mongoose, { Schema, model } from "mongoose";

const Measurement= new Schema({
  shirtLength: Number,
  shirt: Number,
  waistcoat: Number,
  sleeve: Number,
  shoulderWidth: Number,
  neck: Number,
  chest: Number,
  waist: Number,
  bottomWidth: Number,
  trouserLength: Number,
  hem: Number, 
  front: Number,
  collar: Number, 
  ban:Number,
  side: Number,
  cuff: Number,
  additionalDetails: {
    type: String,
    default: ""
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  }
},{timestamps:true});


export const Measurements = mongoose.model('Measurements', Measurement);
