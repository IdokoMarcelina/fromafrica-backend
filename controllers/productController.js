const express = require('express')

const Product = require('../models/ProductModel');

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
      photo,
    } = req.body;
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
      !photo){
        return res.status(400).json({message: "all fields are required"})

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
        photo,
        })

        await newProduct.save()

        res.status(201).json({message: "product added successfully", product: newProduct})
    } catch (error) {
        res.status(500).json({message: "sever error", error: error.message})
    }
}

module.exports = {
    addProduct,
}