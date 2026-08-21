import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store_settings', unique: true },
    storeName: { type: String, default: 'Kalla Makan' },
    tagline: { type: String, default: 'Form Pemesanan Cepat Asinan Buah Segar' },
    whatsappNumber: { type: String, default: '6282227418224' },
    storeHours: { type: String, default: '09:00 - 21:00 WIB' },
    storeLocation: { type: String, default: 'Jakarta Barat, DKI Jakarta' },
    isOpen: { type: Boolean, default: true },
    announcement: { type: String, default: '🛒 Form Pemesanan Resmi Kalla Makan • Fast Respon via WhatsApp' },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
