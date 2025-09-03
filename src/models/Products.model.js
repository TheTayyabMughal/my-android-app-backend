import mongoose, { Schema } from "mongoose";
const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    pics: [{ type: String }],
    gltfModels: [{ type: String }],
    sellerinfo: {
      type: Schema.Types.ObjectId,
      ref: "Sellers",
    },
    quantity: {
      type: Number,
      required: true,
    },
    Category:{
      type:String,
    },
    color: {
      type: String,
    },
    instock:{
      type:Boolean,
      enum:[true,false],
      default:true,
    },
    description:{
      type:String,
    },
    Dprice: {
      type: String,
    },
    brand:{
      type:String,
      required:true
    }
  },
  { timestamps: true }
);
export const Products = mongoose.model("Products", ProductSchema);
