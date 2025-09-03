import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Products } from "../models/Products.model.js";
import { uploadonCloudinary } from "../utils/Fileupload.js";

const createProducts = asynchandler(async (req, res) => {
  const sellerid = req.seller._id;
  const { name, price, quantity, color, Dprice, Category, description,brand } =
    req.body;
  if ([name, price, quantity].some((item) => item.trim() === "")) {
    throw new Apierror(400, "Please fill the required fields");
  }

  const pics = [];
  const gltfModels=[];
  if (req.files && req.files.pics) {
    for (const file of req.files.pics) {
      const result = await uploadonCloudinary(file.path);
      if (result) {
        pics.push(result.url);
      }
    }
  }

  if(req.files && req.files.gltfModels){
    for(const file of req.files.gltfModels){
      const result = await uploadonCloudinary(file.path);
       if(result){
        gltfModels.push(result.url)
       }
    }
  }

  const newProduct = await Products.create({
    name,
    price,
    pics,
    gltfModels,
    sellerinfo: sellerid,
    quantity,
    Category,
    color,
    Dprice,
    description:description,
    brand,
  });

  res
    .status(200)
    .json(new Apiresponse(200, newProduct, "Product created Successfully"));
});

const getAllProducts = asynchandler(async (req, res) => {
  const products = await Products.find().populate(
    "sellerinfo",
    "name email address businessName phone status"
  );

  res
    .status(200)
    .json(new Apiresponse(200, products, "Products fetched successfully"));
});

const getProductbyId = asynchandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Apierror(400, "Invalid Product Id");
  }
  const Product = await Products.findById(id).populate(
    "sellerinfo",
    "name address businessName email phone status"
  );
  if (!Product) {
    throw new Apierror(400, "Product not found");
  }

  res
    .status(200)
    .json(new Apiresponse(200, Product, "Product Fetched Successfully"));
});

const UpdateProduct = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, quantity, color, dprice, Category, description,instock } =
    req.body;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Apierror(400, "Invalid Product id");
  }
  

  const updateFields = {};
  if (name) updateFields.name = name;
  if (price) updateFields.price = price;
  if (quantity) updateFields.quantity = quantity;
  if (color) updateFields.color = color;
  if (dprice) updateFields.dprice = dprice;
  if (Category) updateFields.Category = Category;
  if (description) updateFields.description = description;
  
  // if(instock) updateFields.instock=quantity>0;

  if(instock) updateFields.instock=instock;

  const foundProduct = await Products.findById(id);
  if (!foundProduct) {
    throw new Apierror(400, "Product not found");
  }
  if (req.files && req.files.length > 0) {
    const updatedPics = [];
    for (const file of req.files) {
      const result = await uploadonCloudinary(file.path);
      if (result) {
        updatedPics.push(result.url);
      }
    }
    if (updatedPics.length > 0) {
      updateFields.pics = [...foundProduct.pics, ...updatedPics];
    }
  }

  const updatedProduct = await Products.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!updatedProduct) {
    throw new Apierror(400, "Product not found");
  }

  res
    .status(200)
    .json(new Apiresponse(200, updatedProduct, "Product updated successfully"));
});

const deleteProduct = asynchandler(async (req, res) => {
  const { id } = req.params;

  const deletedProduct = await Products.findOneAndDelete({ _id: id });

  if (!deletedProduct) {
    throw new Apierror(400, "Product not deleted");
  }

  res.status(200).json(`Product with id deleted successfully`);
});

const currentSeller = asynchandler(async (req, res) => {
  const seller = req.seller;
  return res
    .status(200)
    .json(new Apiresponse(200, [seller], "seller info fetched successfully"));
});

const getProductsBySellerId = asynchandler(async (req, res) => {
  const sellerId = req.seller._id;
  const products = await Products.find({ sellerinfo: sellerId }).populate(
    "sellerinfo",
    "name address businessName"
  );
  if (!products) {
    throw new Apierror(400, "No products found");
  }
  res
    .status(200)
    .json(new Apiresponse(200, products, "Products fetched successfully"));
});
const getProductsByCategory = asynchandler(async (req, res) => {
  const { name } = req.params;
  const products = await Products.find({ Category: name });
  console.log(products);
  if (!products) {
    throw new Apierror(400, "No products found");
  }
  return res
    .status(200)
    .json(
      new Apiresponse(
        200,
        products,
        "Products Fetched Successfully by Categories"
      )
    );
});
const getProductsBybrand = asynchandler(async (req, res) => {
  const { name } = req.params;
  const products = await Products.find({ brand: name });
  console.log(products);
  if (!products) {
    throw new Apierror(400, "No products found");
  }
  return res
    .status(200)
    .json(
      new Apiresponse(
        200,
        products,
        "Products Fetched Successfully by Categories"
      )
    );
});

export {
  createProducts,
  getAllProducts,
  getProductbyId,
  deleteProduct,
  UpdateProduct,
  currentSeller,
  getProductsBySellerId,
  getProductsByCategory,
  getProductsBybrand,
};

