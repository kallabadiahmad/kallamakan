import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  id: { type: String, required: true },
  size: { type: String, required: true },
  price: { type: Number, required: true },
  hpp: { type: Number, default: 0 },
});

const ProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'kiamboy' },
    badge: { type: String, default: '' },
    image: { type: String, default: '' },
    active: { type: Boolean, default: true },
    variants: [VariantSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
