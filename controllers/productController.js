const express = require('express')
const cloudinary = require('cloudinary').v2;
const Product = require('../models/ProductModel');
const multer = require('multer')
const addProduct = async (req,res)=>{

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
    } = req.body;

    const productPic = req.file;

    try {
        if(!productName ||
      !description ||
      !category ||
      !tags ||
      !shortDescription ||
      !status ||
      !visibility ||
      !publishSchedule ||
      !manufacturerName ||
      !brand ||
      !stocks ||
      !price ||
      !discount ||
      !productPic){
        return res.status(400).json({message: "all fields are required"})

        }

        let cloudImage = null;

        try {
            cloudImage = await cloudinary.uploader.upload(req.file.path)


        } catch (error) {
            return res.status(500).json({message: "Error uploading image to cloudinary.", error: error.message})
        }

        const publishDate = new Date(publishSchedule);

        const newProduct = new Product({
        productName,
        description,
        category,
        tags,
        shortDescription,
        status,
        visibility,
        publishSchedule: publishDate,
        manufacturerName,
        brand,
        stocks,
        price,
        discount,
        productPic:cloudImage.secure_url,
        })

        await newProduct.save()

        res.status(201).json({message: "product added successfully", product: newProduct})
    } catch (error) {
        res.status(500).json({message: "sever error", error: error.message})
    }
}

module.exports = {
    addProduct
}