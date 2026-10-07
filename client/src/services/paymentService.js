/**
 * Payment Service for WhyCode Checkout
 * Manages dynamic UPI/QR transactions, payload formatting, expiration timers,
 * session persistence, and status polling.
 */

import API from "./api";

const STORAGE_KEY = "whycode_active_qr_transaction";

/**
 * Generate a standard UPI deep-link payment URL
 * Spec: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&tr=<txnRef>&cu=INR&tn=<note>
 */
export function generateUPIPayload({ vpa = "whycode.pay@icici", merchantName = "WhyCode Technologies", amount, orderId, planName }) {
  const note = encodeURIComponent(`WhyCode ${planName || "Startup"} Subscription`);
  const pn = encodeURIComponent(merchantName);
  const cleanAmount = Number(amount).toFixed(2);
  
  return `upi://pay?pa=${vpa}&pn=${pn}&am=${cleanAmount}&tr=${orderId}&cu=USD&tn=${note}`;
}

/**
 * Create a new payment transaction with dynamic QR payload & expiration timestamp
 */
export async function createPaymentTransaction({ planId = "startup", planName = "Startup", amount = 10.00 }) {
  // If a backend endpoint exists, try to call it, otherwise create a local verifiable transaction
  try {
    const res = await API.post("/payment/create-order", { planId, amount });
    if (res.data && res.data.transactionId) {
      const txn = {
        transactionId: res.data.transactionId,
        orderId: res.data.orderId || `WHY-${planId.toUpperCase()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
        amount: Number(amount),
        planId,
        planName,
        expiresAt: res.data.expiresAt || (Date.now() + 300 * 1000), // 5 minutes
        upiPayload: res.data.upiPayload || generateUPIPayload({ amount, orderId: res.data.orderId, planName }),
        status: "PENDING",
        createdAt: Date.now()
      };
      saveActiveTransaction(txn);
      return txn;
    }
  } catch (_) {
    // Fallback: Local transactional mock with full API structure ready for backend connection
  }

  const orderId = `WHY-${planId.toUpperCase()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  const transactionId = `GS-UPI-${Math.floor(10000 + Math.random() * 90000)}`;
  const expiresAt = Date.now() + 300 * 1000; // Exactly 5 minutes from now

  const transaction = {
    transactionId,
    orderId,
    amount: Number(amount),
    planId,
    planName,
    expiresAt,
    upiPayload: generateUPIPayload({ amount, orderId, planName }),
    status: "PENDING",
    createdAt: Date.now()
  };

  saveActiveTransaction(transaction);
  return transaction;
}

/**
 * Save active transaction to sessionStorage so it survives page reloads
 */
export function saveActiveTransaction(txn) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(txn));
  } catch (_) {}
}

/**
 * Retrieve saved transaction from sessionStorage
 */
export function getSavedActiveTransaction() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (_) {
    return null;
  }
}

/**
 * Clear saved active transaction
 */
export function clearActiveTransaction() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

/**
 * Poll payment status
 */
export async function checkPaymentStatus(transactionId) {
  try {
    const res = await API.get(`/payment/status/${transactionId}`);
    return res.data; // { status: "PENDING" | "PROCESSING" | "SUCCESS" | "EXPIRED" | "FAILED" }
  } catch (_) {
    // If backend route is not mounted yet, return PENDING status
    return { status: "PENDING" };
  }
}
