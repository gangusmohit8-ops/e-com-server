import { cart_model } from '../model/cart_model.js';
import { product_model } from '../model/product_model.js';
import { error_handling, AppError } from '../middleware/allerror.js';

/**
 * @desc    Add item to cart
 * @route   POST /api/v1/cart
 * @access  Private
 */
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    if (!productId || !size) {
      throw new AppError('Please provide productId and size', 400);
    }

    // Check product exists and is active
    const product = await product_model.findOne({ _id: productId, isActive: true });
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.stock < quantity) {
      throw new AppError('Not enough stock available', 400);
    }

    // Validate size
    if (!product.sizes.includes(size)) {
      throw new AppError('Invalid size selected', 400);
    }

    let cart = await cart_model.findOne({ user: req.user._id });

    if (!cart) {
      // Create new cart
      cart = await cart_model.create({
        user: req.user._id,
        items: [{
          product: productId,
          quantity: Number(quantity),
          size,
          color: color || '',
          price: product.price
        }]
      });
    } else {
      // Check if item already exists in cart (same product + size + color)
      const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === productId && item.size === size && item.color === (color || '')
      );

      if (existingItemIndex > -1) {
        // Update quantity
        cart.items[existingItemIndex].quantity += Number(quantity);
        cart.items[existingItemIndex].price = product.price;
      } else {
        // Add new item
        cart.items.push({
          product: productId,
          quantity: Number(quantity),
          size,
          color: color || '',
          price: product.price
        });
      }

      await cart.save();
    }

    // Populate product details
    await cart.populate('items.product', 'name images price mrp discount stock');

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
export const getCart = async (req, res) => {
  try {
    let cart = await cart_model.findOne({ user: req.user._id })
      .populate('items.product', 'name images price mrp discount stock isActive');

    if (!cart) {
      cart = { items: [], totalPrice: 0, totalItems: 0 };
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/v1/cart/:itemId
 * @access  Private
 */
export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (!quantity || quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    const cart = await cart_model.findOne({ user: req.user._id });
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      throw new AppError('Item not found in cart', 404);
    }

    // Check stock
    const product = await product_model.findById(cart.items[itemIndex].product);
    if (product && product.stock < quantity) {
      throw new AppError(`Only ${product.stock} items available`, 400);
    }

    cart.items[itemIndex].quantity = Number(quantity);
    await cart.save();

    await cart.populate('items.product', 'name images price mrp discount stock');

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: cart
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/:itemId
 * @access  Private
 */
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await cart_model.findOne({ user: req.user._id });
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    await cart.populate('items.product', 'name images price mrp discount stock');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/v1/cart
 * @access  Private
 */
export const clearCart = async (req, res) => {
  try {
    const cart = await cart_model.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: { items: [], totalPrice: 0, totalItems: 0 }
    });
  } catch (error) {
    error_handling(error, res);
  }
};
