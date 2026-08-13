const mongoose = require("mongoose");

const wpOrderSchema = new mongoose.Schema(
  {
    wpOrderId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    billingEmail: {
      type: String,
      default: "",
      index: true
    },
    billingName: {
      type: String,
      default: ""
    },
    billingPhone: {
      type: String,
      default: ""
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          default: null
        },
        wpProductId: {
          type: Number,
          default: null
        },
        name: {
          type: String,
          default: ""
        },
        price: {
          type: Number,
          default: 0
        },
        quantity: {
          type: Number,
          default: 1
        },
        image: {
          type: String,
          default: ""
        },
        isDigital: {
          type: Boolean,
          default: false
        }
      }
    ],
    subtotal: {
      type: Number,
      default: 0
    },
    gstAmount: {
      type: Number,
      default: 0
    },
    deliveryCharge: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    couponCode: {
      type: String,
      default: ""
    },
    total: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: "Delivered",
      enum: ["Delivered", "Pending", "Cancelled"]
    },
    paymentStatus: {
      type: String,
      default: "Paid",
      enum: ["Paid", "Pending", "Failed"]
    },
    paymentMethod: {
      type: String,
      default: "Razorpay"
    },
    refundStatus: {
      type: String,
      default: "Not Applicable"
    },
    transactionId: {
      type: String,
      default: ""
    },
    billing: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "IN" }
    },
    shipping: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "IN" }
    },
    currencyDisplay: {
      currency: { type: String, default: "INR" },
      amount: { type: Number, default: 0 },
      detectedCountry: { type: String, default: "IN" }
    },
    wpCreatedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    wpPaidAt: {
      type: Date,
      default: null
    },
    wpDeliveredAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("WpOrder", wpOrderSchema);
