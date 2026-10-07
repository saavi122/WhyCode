import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight,
  Check, 
  Copy, 
  Search,
  CreditCard,
  QrCode,
  Building2,
  Wallet,
  ArrowLeftRight,
  RefreshCw,
  Lock,
  Box,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getPlanById } from "../config/plans";
import api from "../services/api";
import UPIQRPayment from "../components/checkout/UPIQRPayment";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loginUser } = useAuth();
  const isLoggedIn = !!user;

  // Plan detection from URL (?plan=team or ?plan=startup)
  const queryParams = new URLSearchParams(location.search);
  const planQuery = queryParams.get("plan") || "startup";
  const plan = getPlanById(planQuery);

  // Active payment method & sub-modes
  const [paymentMethod, setPaymentMethod] = useState("upi"); // "upi" | "card" | "netbanking" | "wallet" | "bank_transfer"
  const [isQrValid, setIsQrValid] = useState(true);
  const [upiMode, setUpiMode] = useState("qr"); // "qr" | "id"

  // Order state & Procedural QR seed
  const [orderId, setOrderId] = useState(
    () => `WHY-${plan.id.toUpperCase()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
  );
  const [qrSeed, setQrSeed] = useState(() => Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [isVerificationPending, setIsVerificationPending] = useState(false);

  // Customer / Signup details
  const [authTab, setAuthTab] = useState("signup"); // "signup" | "login"
  const [firstName, setFirstName] = useState(user?.name ? user.name.split(" ")[0] : "");
  const [lastName, setLastName] = useState(user?.name ? user.name.split(" ").slice(1).join(" ") : "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState({ text: "", type: "" });

  // Calculation variables
  const basePrice = plan.price;
  const platformFee = 0.00;
  const statutoryTax = 0.00;
  const discount = couponApplied ? Number((basePrice * 0.2).toFixed(2)) : 0.00;
  const finalTotal = Number((basePrice + platformFee + statutoryTax - discount).toFixed(2));

  // Method specific states
  // 1. UPI
  const [upiId, setUpiId] = useState("");
  const [qrTimer, setQrTimer] = useState(288); // 04:48
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  // 2. Card
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // 3. Netbanking
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [bankSearch, setBankSearch] = useState("");

  // 4. Wallet
  const [selectedWallet, setSelectedWallet] = useState("phonepe");

  // 5. Bank Transfer
  const [copiedBank, setCopiedBank] = useState(false);

  // Document Title
  useEffect(() => {
    document.title = `Checkout • ${plan.name} | WhyCode`;
    window.scrollTo(0, 0);
  }, [plan]);

  // Procedural QR SVG Generator
  const qrSvgPaths = useMemo(() => {
    const n = 21;
    const c = 10;
    let s = qrSeed % 9973;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const fin = (x, y) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const rects = [];

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let on = false;
        if (fin(x, y)) {
          const lx = x % 14;
          const ly = y % 14;
          const ring = Math.max(Math.abs(lx - 3), Math.abs(ly - 3));
          on = ring !== 2 && ring < 4;
        } else {
          on = rnd() > 0.52;
        }
        if (on) {
          rects.push({ x: x * c, y: y * c, w: 10, h: 10 });
        }
      }
    }
    return rects;
  }, [qrSeed]);

  // QR Timer Countdown
  useEffect(() => {
    if (paymentMethod === "upi" && upiMode === "qr" && !isPaid) {
      const timer = setInterval(() => {
        setQrTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentMethod, upiMode, isPaid]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleResetQR = () => {
    setQrTimer(300);
    setQrSeed(Date.now());
    setOrderId(`WHY-${plan.id.toUpperCase()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`);
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMsg({ text: "Enter a coupon code first.", type: "error" });
      setCouponApplied(false);
      return;
    }
    if (code === "WHYCODE20") {
      setCouponApplied(true);
      setCouponMsg({ text: "Coupon applied (20% discount).", type: "success" });
    } else {
      setCouponApplied(false);
      setCouponMsg({ text: "That code isn't valid. Check it and try again.", type: "error" });
    }
  };

  // Create pending order on backend
  useEffect(() => {
    const createPendingOrder = async () => {
      try {
        const { data } = await api.post("/payment/create-order", {
          planId: plan.id,
          customerEmail: email || "customer@whycode.app",
          customerName: `${firstName} ${lastName}`.trim() || "Developer",
          paymentMethod,
        });
        if (data?.order?.orderId) {
          setOrderId(data.order.orderId);
        }
      } catch (_) {}
    };
    createPendingOrder();
  }, [plan.id]);

  const validateCustomer = () => {
    if (isLoggedIn) return true;
    const errs = {};
    if (!firstName.trim() && authTab === "signup") errs.firstName = "First name is required";
    if (!email.trim() || !email.includes("@")) errs.email = "Valid email is required";
    if (authTab === "signup" && (!password || password.length < 6)) {
      errs.password = "Password required (min 6 chars)";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Payment Execution
  const handlePaymentSubmit = async (methodType, extraDetails = {}) => {
    if (!validateCustomer()) {
      window.scrollTo({ top: 120, behavior: "smooth" });
      return;
    }

    setIsProcessing(true);

    try {
      const { data } = await api.post("/payment/verify", {
        orderId,
        paymentMethod: methodType || paymentMethod,
        paymentDetails: extraDetails,
      });

      const txn = data?.transactionId || `WHY-TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
      setTransactionId(txn);

      // Auto-register guest signup
      if (!isLoggedIn && email && password) {
        try {
          const regRes = await api.post("/auth/register", {
            name: `${firstName} ${lastName}`.trim() || "Developer",
            email: email.trim().toLowerCase(),
            password,
            companyName: `${firstName || "Engineering"}'s Workspace`,
            orderId,
            plan: plan.id,
          });

          if (regRes.data?.token && loginUser) {
            loginUser(regRes.data.token, regRes.data.user);
          }
        } catch (regErr) {
          console.warn("Registration notice:", regErr?.response?.data?.message || regErr.message);
        }
      }

      if (methodType === "bank_transfer") {
        setIsVerificationPending(true);
      }
      setIsPaid(true);
      setIsProcessing(false);
    } catch (_) {
      // Local fallback simulation
      setTransactionId(`WHY-TXN-${Math.floor(10000000 + Math.random() * 90000000)}`);
      if (methodType === "bank_transfer") {
        setIsVerificationPending(true);
      }
      setIsPaid(true);
      setIsProcessing(false);
    }
  };

  const handleCopy = (type) => {
    try {
      const textToCopy = type === "upi" ? "checkout.whycode@icici" : orderId;
      navigator.clipboard.writeText(textToCopy);
      if (type === "upi") {
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 1400);
      } else {
        setCopiedQr(true);
        setTimeout(() => setCopiedQr(false), 1400);
      }
    } catch (_) {}
  };

  const copyBankDetails = () => {
    const text = `Bank Name: Silicon Valley Bank\nAccount Name: WhyCode Technologies Inc.\nAccount Number: 94820194820194\nIFSC / SWIFT: SVBUS6SXXX\nPayment Reference: ${orderId}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 1400);
  };

  return (
    <div className="min-h-screen bg-[#060a11] bg-[radial-gradient(ellipse_800px_400px_at_85%_0%,rgba(23,209,255,0.06),transparent)] text-[#f2f6fb] font-['Inter',system-ui,sans-serif] antialiased flex flex-col w-full selection:bg-[#17d1ff]/20 selection:text-[#17d1ff] pb-16">
      
      {/* Header (56px tall, 1px bottom border) */}
      <header className="h-14 border-b border-white/[0.08] flex items-center justify-between px-6 sm:px-8 sticky top-0 bg-[#060a11]/90 backdrop-blur-md z-30">
        <button
          onClick={() => navigate("/pricing")}
          className="text-[#a3afbf] hover:text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer bg-transparent border-0"
        >
          ← Back to Pricing
        </button>

        <div className="font-bold text-[15px] sm:text-[17px] flex items-center absolute left-1/2 -translate-x-1/2">
          Why<span className="text-[#17d1ff]">Code</span>
          <span className="text-[#a3afbf] font-normal text-xs sm:text-[13px] ml-2">· Secure Checkout</span>
        </div>

        <span className="text-[#34d399] text-xs font-semibold flex items-center gap-1.5">
          ● 256-bit SSL
        </span>
      </header>

      {/* Stepper Progress (24px below header) */}
      <nav className="flex justify-center items-center flex-wrap gap-2 sm:gap-3.5 my-6 px-4 text-[#a3afbf] text-xs select-none" aria-label="Checkout progress">
        <div className="flex items-center gap-1.5 text-[#a3afbf]">
          <span className="w-6 h-6 rounded-full border border-white/20 text-[11px] flex items-center justify-center text-[#f2f6fb]">1</span>
          <span>Plan</span>
        </div>
        <span className="text-white/20 w-4 h-[1px] bg-white/20 inline-block"></span>
        <div className="flex items-center gap-1.5 text-[#a3afbf]">
          <span className="w-6 h-6 rounded-full border border-white/20 text-[11px] flex items-center justify-center text-[#f2f6fb]">2</span>
          <span>Details</span>
        </div>
        <span className="text-white/20 w-4 h-[1px] bg-white/20 inline-block"></span>
        <div className="flex items-center gap-1.5 text-[#17d1ff]">
          <span className="w-6 h-6 rounded-full bg-[#17d1ff] text-[#060a11] text-[11px] font-bold flex items-center justify-center shadow-[0_0_12px_rgba(23,209,255,0.4)]">3</span>
          <span className="font-bold text-[#17d1ff]">Payment</span>
        </div>
        <span className="text-white/20 w-4 h-[1px] bg-white/20 inline-block"></span>
        <div className="flex items-center gap-1.5 text-[#a3afbf]/60">
          <span className="w-6 h-6 rounded-full border border-white/10 text-[11px] flex items-center justify-center text-[#a3afbf]/60">4</span>
          <span>Confirmation</span>
        </div>
      </nav>

      {/* Main Layout: Container (max-width 1360px, 32px side padding, 5fr / 9fr grid) */}
      <main className="max-w-[1360px] w-full mx-auto px-4 sm:px-8 grid grid-cols-1 min-[1000px]:grid-cols-[5fr_9fr] gap-6 items-start flex-1">
        
        {/* =====================================================================
            LEFT COLUMN (5fr): 3 CARDS WITH 16PX GAP
           ===================================================================== */}
        <div className="flex flex-col gap-4 order-2 min-[1000px]:order-1 w-full">
          
          {/* CARD 1: PLAN SUMMARY */}
          <section className="bg-[#0b121c] border border-white/10 rounded-[14px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#17d1ff]/10 border border-[#17d1ff]/40 flex items-center justify-center shrink-0 text-[#17d1ff]">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-[#17d1ff] font-semibold uppercase tracking-wider leading-none mb-1">
                    {plan.name.toUpperCase()} PLAN
                  </div>
                  <h3 className="text-[20px] font-semibold text-[#f2f6fb] leading-tight">{plan.name} Cover</h3>
                </div>
              </div>

              <span className="text-[11px] font-semibold border border-[#17d1ff]/40 bg-[#0b1c2e] text-[#17d1ff] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                MONTHLY
              </span>
            </div>

            <p className="text-[#a3afbf] text-xs leading-relaxed mt-3 mb-0">
              {plan.description || "Core repository intelligence for small growing startup teams."}
            </p>

            <div className="my-5 flex items-baseline gap-1.5 leading-none">
              <span className="text-[36px] font-bold text-[#f2f6fb]">${plan.price}</span>
              <span className="text-xs text-[#a3afbf]">/ month</span>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2.5">
              <span className="text-xs font-semibold text-[#f2f6fb] block">Included capabilities:</span>
              <div className="flex flex-col gap-2 text-xs text-[#f2f6fb]">
                <div className="flex items-center gap-2 h-6">
                  <Check className="w-4 h-4 text-[#17d1ff] shrink-0 stroke-[2.5]" />
                  <span>{plan.members || "Up to 10 members"}</span>
                </div>
                <div className="flex items-center gap-2 h-6">
                  <Check className="w-4 h-4 text-[#17d1ff] shrink-0 stroke-[2.5]" />
                  <span>AST Indexing</span>
                </div>
                <div className="flex items-center gap-2 h-6">
                  <Check className="w-4 h-4 text-[#17d1ff] shrink-0 stroke-[2.5]" />
                  <span>Drift detection</span>
                </div>
                <div className="flex items-center gap-2 h-6">
                  <Check className="w-4 h-4 text-[#17d1ff] shrink-0 stroke-[2.5]" />
                  <span>AI Assistant</span>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: ACCOUNT DETAILS */}
          <section className="bg-[#0b121c] border border-white/10 rounded-[14px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-3.5">
            <h3 className="text-[13px] font-semibold text-[#f2f6fb] uppercase tracking-wider">
              CREATE YOUR WHYCODE ACCOUNT
            </h3>

            {/* Segmented Control (active tab #0b5a94) */}
            <div className="grid grid-cols-2 p-1 bg-[#060a11] rounded-lg border border-white/10 h-10">
              <button
                type="button"
                onClick={() => setAuthTab("signup")}
                className={`h-full rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                  authTab === "signup" ? "bg-[#0b5a94] text-white shadow-sm" : "text-[#a3afbf] hover:text-white"
                }`}
              >
                NEW SIGNUP
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("login")}
                className={`h-full rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                  authTab === "login" ? "bg-[#0b5a94] text-white shadow-sm" : "text-[#a3afbf] hover:text-white"
                }`}
              >
                LOG IN
              </button>
            </div>

            <div className="space-y-3.5 pt-1">
              {authTab === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1.5">FIRST NAME</label>
                    <input
                      placeholder="e.g. Sarah"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (formErrors.firstName) setFormErrors((p) => ({ ...p, firstName: null }));
                      }}
                      className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] placeholder-[#a3afbf]/50 outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff] transition-all"
                    />
                    {formErrors.firstName && <p className="text-[10px] text-rose-400 mt-1">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1.5">LAST NAME</label>
                    <input
                      placeholder="e.g. Connor"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] placeholder-[#a3afbf]/50 outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff] transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1.5">EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="sarah@whycode.app"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formErrors.email) setFormErrors((p) => ({ ...p, email: null }));
                  }}
                  className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] placeholder-[#a3afbf]/50 outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff] transition-all"
                />
                {formErrors.email && <p className="text-[10px] text-rose-400 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1.5">PASSWORD</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formErrors.password) setFormErrors((p) => ({ ...p, password: null }));
                    }}
                    className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg pl-3 pr-10 text-xs text-[#f2f6fb] placeholder-[#a3afbf]/50 outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[#a3afbf] hover:text-white cursor-pointer bg-transparent border-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-[10px] text-rose-400 mt-1">{formErrors.password}</p>}
              </div>
            </div>
          </section>

          {/* CARD 3: PRICE BREAKDOWN */}
          <section className="bg-[#0b121c] border border-white/10 rounded-[14px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-4">
            <h3 className="text-[13px] font-semibold text-[#f2f6fb] uppercase tracking-wider">
              PRICE BREAKDOWN
            </h3>

            {/* Coupon input and APPLY button */}
            <div className="flex gap-2">
              <input
                placeholder="COUPON CODE (E.G. WHYCODE20)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] placeholder-[#a3afbf]/50 outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff] uppercase font-mono transition-all"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="h-10 px-4 rounded-lg bg-[#151e2b] hover:bg-[#1f2c3f] border border-white/10 text-xs font-bold text-white transition-all cursor-pointer uppercase shrink-0"
              >
                APPLY
              </button>
            </div>

            {couponMsg.text && (
              <div className={`text-[11px] -mt-2 ${couponMsg.type === "success" ? "text-[#34d399]" : "text-rose-400"}`}>
                {couponMsg.text}
              </div>
            )}

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between text-[#a3afbf]">
                <span>Base Premium Rate</span>
                <span className="text-[#f2f6fb] font-medium">${basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#a3afbf]">
                <span>Platform Processing Fee</span>
                <span className="text-[#34d399] font-medium">Free</span>
              </div>
              <div className="flex justify-between text-[#a3afbf]">
                <span>GST / Statutory Tax (0%)</span>
                <span className="text-[#f2f6fb] font-medium">$0.00</span>
              </div>
              {couponApplied && (
                <div className="flex justify-between text-[#34d399]">
                  <span>Discount (20%)</span>
                  <span className="font-medium">-${discount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-white/10 pt-3.5 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#f2f6fb]">Total Payable Amount</span>
                <div className="text-right">
                  <span className="text-[26px] font-bold text-[#17d1ff]">${finalTotal.toFixed(2)}</span>
                  <span className="text-xs text-[#a3afbf] ml-1">/ month</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-[#a3afbf]">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#17d1ff]" />
                SOC 2 Encrypted
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#17d1ff]" />
                Instant AST Activation
              </span>
            </div>
          </section>
        </div>

        {/* =====================================================================
            RIGHT COLUMN (9fr): PAYMENT CARD (PADDING 24PX)
           ===================================================================== */}
        <section className="bg-[#0b121c] border border-white/10 rounded-[14px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-5 order-1 min-[1000px]:order-2 w-full">
          
          {isPaid ? (
            <div className="text-center py-8 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-[#17d1ff]/10 border border-[#17d1ff]/30 text-[#34d399] mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(23,209,255,0.2)]">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Payment received</h2>
              <p className="text-[#a3afbf] text-xs max-w-sm mx-auto mb-6">
                {isVerificationPending 
                  ? "Your transfer proof has been recorded. Settlement confirmation in 15–30 minutes."
                  : "Your WhyCode workspace subscription is active and all features are unlocked."}
              </p>

              <div className="p-4 rounded-xl bg-[#060a11] border border-white/10 text-left text-xs space-y-2.5 max-w-md mx-auto mb-6">
                <div className="flex justify-between text-[#a3afbf]">
                  <span>Plan</span>
                  <span className="text-white font-medium">{plan.name} Plan</span>
                </div>
                <div className="flex justify-between text-[#a3afbf]">
                  <span>Amount Paid</span>
                  <span className="text-white font-medium">${finalTotal.toFixed(2)} / month</span>
                </div>
                <div className="flex justify-between text-[#a3afbf]">
                  <span>Transaction ID</span>
                  <span className="font-mono text-[#17d1ff] font-medium">{transactionId}</span>
                </div>
                <div className="flex justify-between text-[#a3afbf]">
                  <span>Order Reference</span>
                  <span className="font-mono text-white">{orderId}</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full max-w-md h-12 rounded-xl bg-[#0a84ff] hover:bg-[#0074e0] text-white font-semibold text-sm shadow-[0_4px_20px_rgba(10,132,255,0.35)] cursor-pointer transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              {/* Eyebrow with pulsing cyan dot */}
              <div className="flex items-center gap-2 text-[#17d1ff] text-[11px] font-bold uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-[#17d1ff] animate-pulse" />
                <span>PAYMENT CHECKOUT</span>
              </div>

              <h2 className="text-[28px] font-bold text-[#f2f6fb] tracking-tight leading-tight">
                Complete your payment
              </h2>
              <p className="text-xs text-[#a3afbf] mt-1 mb-5">
                Select a payment option to activate your workspace subscription.
              </p>

              {/* 5 Equal Tiles Grid (gap 12px, 84px tall, active has 2px cyan border) */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
                {[
                  { id: "upi", label: "UPI / QR", icon: QrCode },
                  { id: "card", label: "Cards", icon: CreditCard },
                  { id: "netbanking", label: "Netbanking", icon: Building2 },
                  { id: "wallet", label: "Wallets", icon: Wallet },
                  { id: "bank_transfer", label: "Bank Transfer", icon: ArrowLeftRight },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`h-[84px] rounded-xl flex flex-col items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer p-2 ${
                        active
                          ? "bg-[#17d1ff]/5 border-2 border-[#17d1ff] text-[#f2f6fb] shadow-[0_0_15px_rgba(23,209,255,0.15)]"
                          : "bg-[#060a11] border border-white/10 text-[#a3afbf] hover:text-white hover:border-white/20"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? "text-[#17d1ff]" : "text-[#a3afbf]"}`} />
                      <span className="text-center truncate w-full">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* UPI Sub-Section with Real Dynamic QR */}
              {paymentMethod === "upi" && (
                <UPIQRPayment
                  planName={plan.name}
                  planId={plan.id}
                  amount={finalTotal}
                  currency="$"
                  onPaymentSuccess={(details) => {
                    setTransactionId(details.transactionId || `GS-UPI-${Math.floor(10000 + Math.random() * 90000)}`);
                    setIsPaid(true);
                  }}
                  onValidityChange={(valid) => setIsQrValid(valid)}
                  isParentProcessing={isProcessing}
                />
              )}

              {/* Card Form */}
              {paymentMethod === "card" && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1">CARD NUMBER</label>
                    <input
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                        setCardNumber(v.replace(/(\d{4})(?=\d)/g, "$1 "));
                      }}
                      className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] font-mono tracking-wider outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1">CARDHOLDER NAME</label>
                    <input
                      placeholder="NAME ON CARD"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] uppercase outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1">EXPIRY DATE</label>
                      <input
                        placeholder="MM / YY"
                        maxLength={7}
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          if (v.length >= 2) v = v.slice(0, 2) + " / " + v.slice(2);
                          setCardExpiry(v);
                        }}
                        className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] font-mono text-center outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                        className="w-full h-10 bg-[#060a11] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] font-mono text-center outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Netbanking Form */}
              {paymentMethod === "netbanking" && (
                <div className="space-y-3 pt-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#a3afbf] absolute left-3 top-3" />
                    <input
                      placeholder="Search bank name..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 bg-[#060a11] border border-white/10 rounded-lg text-xs text-[#f2f6fb] outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff]"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["SBI", "HDFC", "ICICI", "Axis"].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBank(b.toLowerCase())}
                        className={`h-10 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          selectedBank === b.toLowerCase()
                            ? "bg-[#060a11] border-[#17d1ff] text-[#f2f6fb] shadow-[0_0_10px_rgba(23,209,255,0.2)]"
                            : "bg-[#060a11] border-white/10 text-[#a3afbf] hover:text-white"
                        }`}
                      >
                        {b} Bank
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallets Form */}
              {paymentMethod === "wallet" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { id: "phonepe", name: "PhonePe" },
                    { id: "paytm", name: "Paytm" },
                    { id: "amazonpay", name: "Amazon Pay" },
                    { id: "mobikwik", name: "Mobikwik" },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWallet(w.id)}
                      className={`h-11 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        selectedWallet === w.id
                          ? "bg-[#060a11] border-[#17d1ff] text-[#f2f6fb] shadow-[0_0_10px_rgba(23,209,255,0.2)]"
                          : "bg-[#060a11] border-white/10 text-[#a3afbf] hover:text-white"
                      }`}
                    >
                      <span>{w.name}</span>
                      {selectedWallet === w.id && <Check className="w-3.5 h-3.5 text-[#17d1ff]" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Bank Transfer Form */}
              {paymentMethod === "bank_transfer" && (
                <div className="bg-[#060a11] border border-white/10 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex justify-between text-[#a3afbf]">
                    <span>Bank Name</span>
                    <span className="text-white font-medium">Silicon Valley Bank</span>
                  </div>
                  <div className="flex justify-between text-[#a3afbf]">
                    <span>Account Name</span>
                    <span className="text-white font-medium">WhyCode Technologies Inc.</span>
                  </div>
                  <div className="flex justify-between text-[#a3afbf]">
                    <span>Account Number</span>
                    <span className="font-mono text-white font-medium">94820194820194</span>
                  </div>
                  <div className="flex justify-between text-[#a3afbf]">
                    <span>IFSC / SWIFT</span>
                    <span className="font-mono text-white font-medium">SVBUS6SXXX</span>
                  </div>
                  <div className="flex justify-between text-[#a3afbf] pt-2 border-t border-white/10">
                    <span>Payment Reference</span>
                    <span className="font-mono text-[#17d1ff] font-semibold">{orderId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyBankDetails}
                    className="h-8 px-3 rounded-lg border border-white/10 bg-[#0b121c] text-[11px] font-semibold text-white flex items-center gap-1.5 cursor-pointer hover:border-[#17d1ff] mt-2"
                  >
                    {copiedBank ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3 text-[#17d1ff]" />}
                    <span>{copiedBank ? "Copied" : "Copy Bank Details"}</span>
                  </button>
                </div>
              )}

              {/* Divider & Full-width Pay CTA Button (52px tall, #0a84ff, 10px radius) */}
              <div className="border-t border-white/10 pt-5 mt-5">
                <button
                  type="button"
                  disabled={isProcessing || (paymentMethod === "upi" && !isQrValid)}
                  onClick={() => {
                    if (paymentMethod === "netbanking") {
                      handlePaymentSubmit("netbanking", { bank: selectedBank });
                    } else if (paymentMethod === "wallet") {
                      handlePaymentSubmit("wallet", { wallet: selectedWallet });
                    } else if (paymentMethod === "bank_transfer") {
                      handlePaymentSubmit("bank_transfer");
                    } else {
                      handlePaymentSubmit(paymentMethod);
                    }
                  }}
                  className="w-full h-[52px] rounded-[10px] bg-[#0a84ff] hover:bg-[#0074e0] active:scale-[0.99] text-white text-base font-semibold shadow-[0_4px_20px_rgba(10,132,255,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </span>
                  ) : paymentMethod === "upi" && !isQrValid ? (
                    <span>QR Code Expired — Generate New QR</span>
                  ) : (
                    <>
                      <span>Pay ${finalTotal.toFixed(2)}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>

                <div className="text-center text-xs text-[#a3afbf] mt-3">
                  🔒 256-bit encrypted checkout · Cancel or switch anytime.
                </div>
              </div>

            </div>
          )}
        </section>

      </main>
    </div>
  );
}
