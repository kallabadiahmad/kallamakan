import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  id: String,
  productId: String,
  name: String,
  size: String,
  price: Number,
  hpp: Number,
  emoji: String,
  qty: Number,
});

const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    customer: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    notes: { type: String, default: '' },
    items: [OrderItemSchema],
    subtotal: { type: Number, default: 0 },
    totalHPP: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    shippingName: { type: String, default: 'Kurir' },
    discount: { type: Number, default: 0 },
    voucherCode: { type: String, default: null },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'transfer' },
    paymentBank: { type: String, default: 'DANA' },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
