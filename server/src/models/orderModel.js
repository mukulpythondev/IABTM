import mongoose, { Schema } from 'mongoose';

const orderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
