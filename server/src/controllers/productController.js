import Product from '../models/productModel.js';
import uploadOnCloudinary from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

export const createProduct = async (req, res) => {
    try {
        const fileNames = req.filenames; 
        console.log("Uploaded Files:", fileNames);

        const uploadedFiles = [];

        for (const fileName of fileNames) {
            console.log(fileName)
            console.log(fileName.path)
            const result = await uploadOnCloudinary(fileName.path);
            console.log(result)
            uploadedFiles.push(result.secure_url);
        }

        const { title, shortDescription, description, price, inStock, product_id, category } = req.body;

        const product = new Product({
            title,
            shortDescription,
            description,
            price,
            inStock,
            product_id,
            category
            // picture: uploadedFiles
        });

        await product.save();

        return res.status(201).json(new ApiResponse(201, "Product created successfully", product));
    } catch (error) {
        console.log(error)
        return res.status(500).json(new ApiError(500, "Error creating product", error));
    }
};

export const getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        return res.status(200).json(new ApiResponse(200, "Products fetched successfully", products));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error fetching products", error));
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json(new ApiError(404, "Product not found"));
        }
        return res.status(200).json(new ApiResponse(200, "Product fetched successfully", product));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error fetching product", error));
    }
};

export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) {
            return res.status(404).json(new ApiError(404, "Product not found"));
        }
        return res.status(200).json(new ApiResponse(200, "Product updated successfully", product));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error updating product", error));
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json(new ApiError(404, "Product not found"));
        }
        return res.status(200).json(new ApiResponse(200, "Product deleted successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, "Error deleting product", error));
    }
};
