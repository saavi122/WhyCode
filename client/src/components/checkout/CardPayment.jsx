import React, { useState } from "react";
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  RefreshCw,
  Info
} from "lucide-react";

export default function CardPayment({
  totalAmount = 40.00,
  onPay,
  isProcessing = false
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [errors, setErrors] = useState({});

  // Detect card network
  const getCardNetwork = (num) => {
    const clean = num.replace(/\s+/g, "");
    if (/^4/.test(clean)) return { name: "Visa", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" };
    if (/^(5[1-5]|2[2-7])/.test(clean)) return { name: "Mastercard", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" };
    if (/^3[47]/.test(clean)) return { name: "Amex", color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" };
    if (/^(60|65|81|82|508)/.test(clean)) return { name: "RuPay", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" };
    return null;
  };

  const currentNetwork = getCardNetwork(cardNumber);

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
    if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: null }));
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      const mm = raw.slice(0, 2);
      if (parseInt(mm, 10) > 12) raw = "12" + raw.slice(2);
      if (parseInt(mm, 10) === 0) raw = "01" + raw.slice(2);
      raw = raw.slice(0, 2) + " / " + raw.slice(2);
    }
    setExpiry(raw);
    if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: null }));
  };

  const handleCvvChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCvv(raw);
    if (errors.cvv) setErrors((prev) => ({ ...prev, cvv: null }));
  };

  const validate = () => {
    const errs = {};
    const cleanNum = cardNumber.replace(/\s+/g, "");
    if (!cleanNum || cleanNum.length < 15) {
      errs.cardNumber = "Please enter a valid 16-digit card number";
    }
    if (!cardHolder.trim()) {
      errs.cardHolder = "Please enter cardholder name";
    }
    if (!expiry || expiry.length < 7) {
      errs.expiry = "Enter MM / YY";
    }
    if (!cvv || cvv.length < 3) {
      errs.cvv = "Enter 3-4 digits";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onPay({
      method: "card",
      cardNumber: cardNumber.slice(-4),
      cardHolder,
      network: currentNetwork?.name || "Credit Card",
      amount: totalAmount,
      saveCard
    });
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/60 border border-white/10 backdrop-blur-xl transition-all">
      <div className="pb-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Pay with Credit or Debit Card
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Safe, PCI-DSS Level 1 compliant subscription processing
          </p>
        </div>

        {currentNetwork ? (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${currentNetwork.color}`}>
            {currentNetwork.name}
          </span>
        ) : (
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="text-[10px] font-mono font-bold text-slate-400">VISA</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">MC</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">AMEX</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Card Number */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Card Number <span className="text-cyan-400">*</span>
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="4242 •••• •••• 4242"
              value={cardNumber}
              onChange={handleCardNumberChange}
              className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/80 border ${
                errors.cardNumber ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
              } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none font-mono tracking-wider transition-all`}
            />
          </div>
          {errors.cardNumber && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.cardNumber}
            </p>
          )}
        </div>

        {/* Cardholder Name */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Cardholder Name <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Name as printed on card"
            value={cardHolder}
            onChange={(e) => {
              setCardHolder(e.target.value);
              if (errors.cardHolder) setErrors((prev) => ({ ...prev, cardHolder: null }));
            }}
            className={`w-full px-4 py-2.5 text-sm bg-slate-950/80 border ${
              errors.cardHolder ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
            } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition-all uppercase`}
          />
          {errors.cardHolder && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.cardHolder}
            </p>
          )}
        </div>

        {/* Expiry & CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Expiry Date <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              placeholder="MM / YY"
              value={expiry}
              onChange={handleExpiryChange}
              className={`w-full px-4 py-2.5 text-sm bg-slate-950/80 border ${
                errors.expiry ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
              } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none text-center font-mono transition-all`}
            />
            {errors.expiry && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.expiry}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>CVV / CVC <span className="text-cyan-400">*</span></span>
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Info className="w-2.5 h-2.5" /> 3 digits on back
              </span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="password"
                maxLength={4}
                placeholder="•••"
                value={cvv}
                onChange={handleCvvChange}
                className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-950/80 border ${
                  errors.cvv ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none text-center font-mono tracking-widest transition-all`}
              />
            </div>
            {errors.cvv && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.cvv}
              </p>
            )}
          </div>
        </div>

        {/* Save Card Option */}
        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
          />
          <span>Save card securely for monthly recurring subscription</span>
        </label>

        {/* Security Indicator */}
        <div className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-white/5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Your payment info is end-to-end encrypted. We never store raw CVV codes.</span>
        </div>

        {/* Primary CTA */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-[0_0_25px_rgba(0,229,255,0.25)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing Secure Subscription...
            </>
          ) : (
            <>
              Pay ${totalAmount.toFixed(2)} USD
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
