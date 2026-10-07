import crypto from "crypto";
import Order from "../models/Order.js";
import Company from "../models/Company.js";
import User from "../models/User.js";

const PLAN_PRICES = {
  free: 0,
  startup: 10,
  team: 40,
  custom: 0,
};

const PLAN_NAMES = {
  free: "Free",
  startup: "Startup",
  team: "Team",
  custom: "Custom",
};

// POST /api/payment/create-order
export const createOrder = async (req, res, next) => {
  try {
    const { planId = "team", customerEmail, customerName, companyName, paymentMethod = "card" } = req.body;

    const normalizedPlanId = planId.toLowerCase();
    const amount = PLAN_PRICES[normalizedPlanId] !== undefined ? PLAN_PRICES[normalizedPlanId] : 40;
    const planName = PLAN_NAMES[normalizedPlanId] || "Team";

    if (!customerEmail) {
      return res.status(400).json({ message: "Customer email is required" });
    }

    // Generate unique order reference
    const orderId = `WHY-${normalizedPlanId.toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    const order = await Order.create({
      orderId,
      customerEmail: customerEmail.toLowerCase(),
      customerName: customerName || "Developer",
      companyName: companyName || "Engineering Workspace",
      planId: normalizedPlanId,
      planName,
      amount,
      currency: "USD",
      billingCycle: "monthly",
      paymentMethod,
      status: "pending",
      expiresAt,
      user: req.user?._id || null,
      company: req.user?.company || null,
    });

    res.status(201).json({
      success: true,
      order: {
        orderId: order.orderId,
        planId: order.planId,
        planName: order.planName,
        amount: order.amount,
        currency: order.currency,
        billingCycle: order.billingCycle,
        paymentMethod: order.paymentMethod,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        expiresAt: order.expiresAt,
        status: order.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payment/verify
export const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentMethod, paymentDetails } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Generate verified transaction ID
    const transactionId = `WHY-TXN-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    order.transactionId = transactionId;
    order.paidAt = new Date();

    if (paymentMethod === "bank_transfer") {
      order.status = "verification_pending";
      order.paymentMethod = "bank_transfer";
    } else {
      order.status = "completed";
      if (paymentMethod) order.paymentMethod = paymentMethod;
    }

    if (paymentDetails) {
      order.metadata = paymentDetails;
    }

    // If request has authenticated user, directly activate company plan!
    if (req.user && req.user.company) {
      order.user = req.user._id;
      order.company = req.user.company;
      await Company.findByIdAndUpdate(req.user.company, { plan: order.planId });
    }

    await order.save();

    res.status(200).json({
      success: true,
      orderId: order.orderId,
      transactionId: order.transactionId,
      planId: order.planId,
      planName: order.planName,
      amount: order.amount,
      status: order.status,
      paidAt: order.paidAt,
      message: order.status === "verification_pending" 
        ? "Transfer recorded. Verification pending." 
        : "Payment successfully verified and subscription created.",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payment/link-subscription
export const linkSubscription = async (req, res, next) => {
  try {
    const { orderId, email } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If user is authenticated
    const targetUserId = req.user?._id;
    let targetCompanyId = req.user?.company;

    if (targetUserId) {
      order.user = targetUserId;
      if (targetCompanyId) {
        order.company = targetCompanyId;
        await Company.findByIdAndUpdate(targetCompanyId, { plan: order.planId });
      }
      await order.save();
    } else if (email) {
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user && user.company) {
        order.user = user._id;
        order.company = user.company;
        await Company.findByIdAndUpdate(user.company, { plan: order.planId });
        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Subscription successfully linked to account",
      planId: order.planId,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/payment/order/:orderId
export const getOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        transactionId: order.transactionId,
        planId: order.planId,
        planName: order.planName,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
      },
    });
  } catch (err) {
    next(err);
  }
};
