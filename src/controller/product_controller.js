import { product_model } from '../model/product_model.js';
import { upload_multiple_product_imgs, delete_multiple_product_imgs } from '../img/productimg.js';
import { error_handling, AppError } from '../middleware/allerror.js';

/**
 * @desc    Create a new product
 * @route   POST /api/v1/products
 * @access  Admin/Seller
 */
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, mrp, discount, category, subcategory, fabric, colors, sizes, stock, isFeatured, tags } = req.body;

    if (!name || !description || !price || !mrp || !category) {
      throw new AppError('Please provide name, description, price, mrp, and category', 400);
    }

    // Upload images if provided
    let images = [];
    if (req.files && req.files.length > 0) {
      const buffers = req.files.map(file => file.buffer);
      images = await upload_multiple_product_imgs(buffers);
    }

    const product = await product_model.create({
      name,
      description,
      price: Number(price),
      mrp: Number(mrp),
      discount: discount ? Number(discount) : Math.round(((mrp - price) / mrp) * 100),
      category,
      subcategory: subcategory || '',
      fabric: fabric || '',
      colors: colors ? (typeof colors === 'string' ? JSON.parse(colors) : colors) : [],
      sizes: sizes ? (typeof sizes === 'string' ? JSON.parse(sizes) : sizes) : [],
      images,
      stock: stock ? Number(stock) : 0,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      seller: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get all products (with filtering, sorting, pagination, search)
 * @route   GET /api/v1/products
 * @access  Public
 */
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      fabric,
      color,
      size,
      sort = '-createdAt',
      search,
      featured
    } = req.query;

    // Build filter
    const filter = { isActive: true };

    if (category) filter.category = category.toLowerCase();
    if (fabric) filter.fabric = fabric.toLowerCase();
    if (color) filter.colors = { $in: [color] };
    if (size) filter.sizes = { $in: [size] };
    if (featured === 'true') filter.isFeatured = true;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sorting
    let sortOption = {};
    switch (sort) {
      case 'price_asc': sortOption = { price: 1 }; break;
      case 'price_desc': sortOption = { price: -1 }; break;
      case 'newest': sortOption = { createdAt: -1 }; break;
      case 'rating': sortOption = { ratings: -1 }; break;
      case 'popular': sortOption = { numReviews: -1 }; break;
      default: sortOption = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      product_model.find(filter).sort(sortOption).skip(skip).limit(Number(limit)).lean(),
      product_model.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/v1/products/:id
 * @access  Public
 */
export const getProduct = async (req, res) => {
  try {
    const product = await product_model.findOne({ _id: req.params.id, isActive: true })
      .populate('seller', 'fname lname');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/v1/products/:id
 * @access  Admin/Seller
 */
export const updateProduct = async (req, res) => {
  try {
    let product = await product_model.findById(req.params.id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check ownership (admin can update any, seller only their own)
    if (req.user.role !== 'admin' && product.seller.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to update this product', 403);
    }

    const updateData = { ...req.body };

    // Parse JSON strings if sent via FormData
    if (typeof updateData.colors === 'string') updateData.colors = JSON.parse(updateData.colors);
    if (typeof updateData.sizes === 'string') updateData.sizes = JSON.parse(updateData.sizes);
    if (typeof updateData.tags === 'string') updateData.tags = JSON.parse(updateData.tags);

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const buffers = req.files.map(file => file.buffer);
      const newImages = await upload_multiple_product_imgs(buffers);

      // If replacing images, delete old ones
      if (updateData.replaceImages === 'true' && product.images.length > 0) {
        const oldPublicIds = product.images.map(img => img.public_id);
        await delete_multiple_product_imgs(oldPublicIds);
        updateData.images = newImages;
      } else {
        // Append new images (max 5 total)
        updateData.images = [...product.images, ...newImages].slice(0, 5);
      }
    }

    // Auto-calculate discount if price/mrp changed
    if (updateData.price && updateData.mrp) {
      updateData.discount = Math.round(((updateData.mrp - updateData.price) / updateData.mrp) * 100);
    }

    delete updateData.replaceImages;

    product = await product_model.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/v1/products/:id
 * @access  Admin
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await product_model.findById(req.params.id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get featured products
 * @route   GET /api/v1/products/featured
 * @access  Public
 */
export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await product_model.find({ isFeatured: true, isActive: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get products by category
 * @route   GET /api/v1/products/category/:category
 * @access  Public
 */
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, sort = '-createdAt' } = req.query;

    if (!['suit', 'saree'].includes(category.toLowerCase())) {
      throw new AppError('Invalid category. Use "suit" or "saree"', 400);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      product_model.find({ category: category.toLowerCase(), isActive: true })
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      product_model.countDocuments({ category: category.toLowerCase(), isActive: true })
    ]);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get all products (Admin - including inactive)
 * @route   GET /api/v1/admin/products
 * @access  Admin
 */
export const adminGetAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      product_model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('seller', 'fname lname').lean(),
      product_model.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: products,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    error_handling(error, res);
  }
};
