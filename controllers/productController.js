const express = require('express');
const cloudinary = require('cloudinary').v2;
const Product = require('../models/ProductModel');

const addProduct = async (req, res) => {
  const {
    productName,
    description,
    category,
    tags,
    shortDescription,
    status,
    visibility,
    publishSchedule,
    manufacturerName,
    brand,
    stocks,
    price,
    discount,
    order
  } = req.body;

  const files = req.files; // multiple files

  try {
    // Upload all files to Cloudinary
    //file upload to mulitiple part of the central part of the whole system makes it all less commplicated
    const uploadResults = await Promise.all(
      files.map(file => cloudinary.uploader.upload(file.path))
    );

    const imageUrls = uploadResults.map(result => result.secure_url);

    const publishDate = new Date(publishSchedule);

    const newProduct = new Product({
      productName,
      description,
      category,
      tags: typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags,
      shortDescription,
      status,
      visibility,
      publishSchedule: publishDate,
      manufacturerName,
      brand,
      stocks: Number(stocks),
      price: Number(price),
      discount,
      order,
      productPic: imageUrls, // array of image URLs
      seller: req.user._id 
    });


    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully",
      product: newProduct
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
}; 

const getAllProducts = async (req, res) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 }); // newest first
      res.status(200).json({
        message: 'All products retrieved successfully',
        products
      });
    } catch (error) {
      res.status(500).json({
        message: 'failed to retrive all products',
        error: error.message
      });
    }
  };

  

  const getSingleProduct = async (req, res) => {
    try {
      const product = await Product.findById(req.params.id).populate('seller', 'name email');
  
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      res.status(200).json({
        message: "Product retrieved successfully",
        product
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve product",
        error: error.message
      });
    }
  };

  const editProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      const sellerId = req.user._id;
  
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      // Allow only the seller who added it to edit
      if (product.seller.toString() !== sellerId.toString()) {
        return res.status(403).json({ message: "You are not authorized to edit this product" });
      }
  
      const updatedProduct = await Product.findByIdAndUpdate(productId, req.body, {
        new: true,
        runValidators: true
      });
      
  
      res.status(200).json({
        message: "Product updated successfully",
        product: updatedProduct
      });
  
    } catch (error) {
      res.status(500).json({
        message: "Failed to update product",
        error: error.message
      });
    }
  };

  const deleteProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      const sellerId = req.user._id;
  
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      if (product.seller.toString() !== sellerId.toString()) {
        return res.status(403).json({ message: "You are not authorized to delete this product" });
      }
  
      await Product.findByIdAndDelete(productId);
  
      res.status(200).json({ message: "Product deleted successfully" });
  
    } catch (error) {
      res.status(500).json({
        message: "Failed to delete product",
        error: error.message
      });
    }
  };
  
  

  const getSellerProducts = async (req, res) => {
    try {
      const sellerId = req.user._id;
  
      const products = await Product.find({ seller: sellerId }).sort({ createdAt: -1 });
  
      res.status(200).json({
        message: "Products added by you retrieved successfully",
        products
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve your products",
        error: error.message
      });
    }
  };
  

module.exports = {
  addProduct,
  getAllProducts,
  getSingleProduct,
  editProduct,
  deleteProduct,
  getSellerProducts
};
