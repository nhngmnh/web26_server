import productModel from '../models/productModel.js'
import userModel from '../models/userModel.js'
import cartModel from '../models/cartModel.js';
import jwt from 'jsonwebtoken'
import {v2 as cloudinary} from "cloudinary"
import commentModel from '../models/commentModel.js';
// api add product
const addProduct = async (req, res) => {
    try { 
        const { name, price, description, category, stock_quantity,brand,specifications } = req.body;
        const imageFile = req.file;
        if (!imageFile) res.status(404).json({success:false,message:'image is required'})
        // Kiểm tra xem đủ thông tin chưa
        if (!name || !price || !category || !stock_quantity ||!brand ) {
            return res.json({ success: false, message: "Missing product details" });
        }

        // Kiểm tra giá và số lượng phải là số dương
        if (price <= 0) {
            return res.json({ success: false, message: "Price must be positive and stock cannot be negative" });
        }

        // Upload ảnh sản phẩm lên Cloudinary (nếu có)
        let imageURL = "";
        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
            imageURL = imageUpload.secure_url;
        }

        const productData = {
            name,
            price,
            description,
            specifications:JSON.parse(specifications),
            category,
            brand,
            stock_quantity,
            image_url: imageURL,
            dateAdded: Date.now()
        };

        const newProduct = new productModel(productData);
        await newProduct.save();

        res.json({ success: true, message: "Product added successfully",data:newProduct});
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};
const adminDashboard = async(req,res)=>{
    try {
       
        const comments=await commentModel.find({})
        const products=await productModel.find({})
        const carts=await cartModel.find({})
        const users = await userModel.find({}, '_id image name email');
        const dashData={
            qcomments:comments.length,
            qproducts:products.length,
            qcarts:carts.length,
            users,
        }
        res.json({success:true,dashData})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}
const loginAdmin=async(req,res)=>{
    try {
        const {email,password}=req.body
        if (email===process.env.ADMIN_EMAIL && password===process.env.ADMIN_PASSWORD){
            const token=jwt.sign(email+password,process.env.JWT_SECRET)
            res.json({success:true,token})
        } else {
            res.json({success:false, message:"Invalid credentials"})
        }
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

const updateCart = async (req, res) => {
    try {
        const {status, cartId}=req.body;
        const cart = await cartModel.findByIdAndUpdate(
            cartId, 
            { status: status },
            { new: true } 
        );
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        return res.json({success: true, data:cart});
    } catch (error) {
        console.log(error.message);
        
    }
}
const getProducts = async (req, res) => {
    try {
        const { query, category, brand } = req.query;
        let filter = [];

        if (query) {
            filter.push({
                $or: [
                    {   name: {$regex:query,$options:"i"}},
                    { brand: { $regex: query, $options: "i" } }, 
                    { category: { $regex: query, $options: "i" } }, 
                    { description: { $regex: query, $options: "i" } }
                ]
            });
        }

        if (category) {
            filter.push({ category });
        }

        if (brand) {
            filter.push({ brand });
        }
        const products = await productModel.find(filter.length ? { $and: filter } : {});

        res.json({ success: true, products: products});
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const changeProductAvailability=async(req,res)=>{
    try {
        
        const {productId}=req.body;
        if (!productId) return res.json({ success: false, message:"productId is required"});
        const productData=await productModel.findById(productId)
        if(!productData) return res.json({ success: false, message:"ko có dl"});
        const data = await productModel.findByIdAndUpdate(
            productId, 
            { available: !productData?.available },  // Optional chaining to avoid errors if productData is undefined
            { new: true }  // Thêm { new: true } để trả về đối tượng đã được cập nhật
          ).select('-image_url');
        res.json({success:true,message:"Availability Changed",data:data})
    } catch (error) {
         console.log(error)
        res.json({success:false,message:error.message})
    }
}
export {
    addProduct,getProducts,adminDashboard,loginAdmin,updateCart,changeProductAvailability
}