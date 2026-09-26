import mongoose from 'mongoose';

const order_item_schema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    required: true
  },
  name: { type: String, required: true },
  image: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  size: { type: String, required: true },
  color: { type: String, default: '' },
  price: { type: Number, required: true }
}, { _id: true });

const order_schema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  orderNumber: {
    type: String,
    unique: true
  },
  items: [order_item_schema],
  shippingAddress: {
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: Number, required: true },
    landmark: { type: String, default: '' }
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  shippingCharge: {
    type: Number,
    default: 0
  },
  statusHistory: [{
    status: { type: String },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' }
  }],
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String, default: '' }
}, { timestamps: true });

// Generate unique order number before saving
order_schema.pre('save', function () {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
});

// Index for queries
order_schema.index({ user: 1, createdAt: -1 });
order_schema.index({ orderStatus: 1 });

export const order_model = mongoose.model('orders', order_schema);
