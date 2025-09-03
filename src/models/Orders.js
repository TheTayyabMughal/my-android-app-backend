import mongoose, { Schema } from "mongoose";

const OrderItemSchema = new Schema({
  ServiceId: {
    type: Schema.Types.ObjectId,
    ref: "Services",
    required: true,
  },
  ServiceProviderId: {
    type: Schema.Types.ObjectId,
    ref: "ServiceProviders",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  lengths: [
    {
      type: String,
      required: true,
    },
  ],
  comments: {
    type: String,
  },
  measurements: {
    type: Schema.Types.ObjectId,
    ref: "Measurements"
  }
});

const OrderStatusHistory = new Schema({
  status: {
    type: String,
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  note: String
});

const OrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    orders: [OrderItemSchema],
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending", 
        "Confirmed", 
        "Processing", 
        "Ready for Pickup", 
        "Out for Delivery", 
        "Delivered", 
        "Cancelled", 
        "Refunded"
      ],
      default: "Pending",
    },
    statusHistory: [OrderStatusHistory],
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending"
    },
    stripePaymentIntentId: {
      type: String
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    estimatedDeliveryDate: {
      type: Date
    },
    actualDeliveryDate: {
      type: Date
    },
    rider: {
      type: Schema.Types.ObjectId,
      ref: "Riders",
    },
    assignedAt: {
      type: Date
    },
    feedback: {
      type: Schema.Types.ObjectId,
      ref: "Feedback"
    },
    specialInstructions: {
      type: String
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium"
    }
  },
  { timestamps: true }
);

// Auto-generate order number
OrderSchema.pre('save', async function(next) {
  try {
    if (!this.orderNumber) {
      const count = await mongoose.model('Orders').countDocuments();
      this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    }
    
    // Add status history entry if status changed and no history entry exists for this status change
    // Only add if this is not already being handled by updateOrderStatus
    if (this.isModified('status') && !this.isNew && 
        (!this.statusHistory || !this.statusHistory.some(history => 
          history.status === this.status && 
          new Date(history.updatedAt).getTime() > Date.now() - 1000))) {
      
      this.statusHistory.push({
        status: this.status,
        updatedBy: this.user, // Default to order owner if not specified
        updatedAt: new Date(),
        note: "Status updated automatically"
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

export const Orders = mongoose.model("Orders", OrderSchema);

// {
//   "user": "668f8f51deb93bc899f4599a",
//   "orders": [
//       {
//           "productId": "669cd4579fbb0e6128b11c4d",
//           "name": "Bed test",
//           "price": "1000000",
//           "quantity": 2,
//           "pic": "http://res.cloudinary.com/dvmccihlf/image/upload/v1721553699/dmq7wpyf21iboganmfyn.avif"
//       }
//   ],
//   "total": "2000000.00",
//   "status": "Pending",
//   "paymentMethod": "Cash on Delivery",
//   "userinfo": {
//       "name": "abdullah",
//       "email": "abdullah03350904415@gmail.com",
//       "phone": "03174213756",
//       "country": "Pakistan",
//       "city": "lahore",
//       "address": "house no 47A street 18 walton railway officers colony Lahore",
//       "postalCode": "123456",
//       "permanentAddress": "house no 47A street 18 walton railway officers colony Lahore",
//       "shippingAddress": "house no 47A street 18 walton railway officers colony Lahore"
//   }
// }
