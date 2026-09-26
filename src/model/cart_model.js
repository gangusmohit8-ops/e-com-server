import mongoose from 'mongoose';

const cart_item_schema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  size: {
    type: String,
    required: [true, 'Please select a size'],
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']
  },
  color: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true
  }
}, { _id: true });

const cart_schema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    unique: true
  },
  items: [cart_item_schema],
  totalPrice: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Auto-calculate totals before saving
cart_schema.pre('save', function () {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

export const cart_model = mongoose.model('carts', cart_schema);
