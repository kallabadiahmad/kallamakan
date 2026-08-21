import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
