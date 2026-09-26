import mongoose from 'mongoose';

const product_schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'MRP cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['suit', 'saree'],
    lowercase: true
  },
  subcategory: {
    type: String,
    trim: true,
    default: ''
  },
  fabric: {
    type: String,
    trim: true,
    default: '',
    enum: ['', 'cotton', 'silk', 'chiffon', 'georgette', 'crepe', 'satin', 'linen', 'velvet', 'net', 'rayon', 'polyester', 'wool', 'other']
  },
  colors: [{
    type: String,
    trim: true
  }],
  sizes: [{
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']
  }],
  images: [{
    public_id: { type: String, required: true },
    secure_url: { type: String, required: true },
    url: { type: String }
  }],
  stock: {
    type: Number,
    required: [true, 'Stock count is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  ratings: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

// Text index for search
product_schema.index({ name: 'text', description: 'text', tags: 'text' });
// Index for filtering
product_schema.index({ category: 1, price: 1, isActive: 1 });
product_schema.index({ isFeatured: 1, isActive: 1 });

export const product_model = mongoose.model('products', product_schema);
