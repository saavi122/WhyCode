import React, { useState, useEffect } from "react";
import { 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Copy,
  Check
} from "lucide-react";

export default function UPIPayment({
  totalAmount = 40.00,
  onPay,
  isProcessing = false,
  orderId = "WHY-TEAM-ORD"
}) {
  const [upiMode, setUpiMode] = useState("qr"); // Default to QR
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(299); // 04:59 countdown
  const [isExpired, setIsExpired] = useState(false);

  const quickHandles = ["@okhdfcbank", "@okaxis", "@okicici", "@ybl", "@paytm"];

  useEffect(() => {
    let interval = null;
    if (timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else {
      setIsExpired(true);
    }
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const handleResetQR = () => {
    setTimerSeconds(299);
    setIsExpired(false);
  };

  const handleApplyHandle = (handle) => {
    const username = upiId.split("@")[0] || "dev";
    setUpiId(`${username}${handle}`);
    setUpiError("");
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    if (upiMode === "id") {
      if (!upiId.trim()) {
        setUpiError("Please enter your UPI ID");
        return;
      }
      if (!upiId.includes("@") || upiId.split("@")[1]?.length < 2) {
        setUpiError("Please enter a valid UPI ID (e.g. username@okhdfcbank)");
        return;
      }
      setUpiError("");
      onPay({
        method: "upi",
        mode: "id",
        upiId: upiId.trim(),
        amount: totalAmount,
      });
    } else {
      // Trigger instant QR confirmation
      onPay({
        method: "upi",
        mode: "qr",
        upiId: "checkout.whycode@icici",
        amount: totalAmount,
      });
    }
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/60 border border-white/10 backdrop-blur-xl transition-all">
      <div className="pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Pay using UPI
              <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Instant Activation
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scan dynamic QR with any UPI app or enter your UPI ID
            </p>
          </div>
        </div>

        {/* Sub-selector: UPI QR vs ID */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-950/80 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setUpiMode("qr")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              upiMode === "qr"
                ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Scan QR Code
          </button>

          <button
            type="button"
            onClick={() => setUpiMode("id")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              upiMode === "id"
                ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            UPI ID / VPA
          </button>
        </div>
      </div>

      {/* Mode 1: Scan QR Code */}
      {upiMode === "qr" && (
        <div className="mt-5 text-center space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-white/10 inline-block max-w-sm w-full mx-auto relative overflow-hidden">
            {/* Ambient QR glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-violet-500/20 rounded-full blur-xl pointer-events-none" />

            <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-cyan-400" />
              Scan with Google Pay, PhonePe, Paytm, BHIM
            </div>

            {/* Generated QR Code Box */}
            <div className="relative mx-auto w-48 h-48 sm:w-52 sm:h-52 p-3.5 bg-white rounded-xl shadow-2xl flex items-center justify-center">
              {isExpired ? (
                <div className="text-center p-3 text-slate-900">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">QR Expired</p>
                  <button
                    type="button"
                    onClick={handleResetQR}
                    className="mt-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-semibold"
                  >
                    Regenerate
                  </button>
                </div>
              ) : (
                <svg viewBox="0 0 200 200" className="w-full h-full text-slate-950">
                  <rect width="200" height="200" fill="#ffffff" />
                  {/* Corner Targets */}
                  <rect x="15" y="15" width="45" height="45" rx="6" fill="#030305" />
                  <rect x="23" y="23" width="29" height="29" rx="3" fill="#ffffff" />
                  <rect x="29" y="29" width="17" height="17" rx="2" fill="#00e5ff" />

                  <rect x="140" y="15" width="45" height="45" rx="6" fill="#030305" />
                  <rect x="148" y="23" width="29" height="29" rx="3" fill="#ffffff" />
                  <rect x="154" y="29" width="17" height="17" rx="2" fill="#8a2be2" />

                  <rect x="15" y="140" width="45" height="45" rx="6" fill="#030305" />
                  <rect x="23" y="148" width="29" height="29" rx="3" fill="#ffffff" />
                  <rect x="29" y="154" width="17" height="17" rx="2" fill="#00e5ff" />

                  {/* QR Data Cells */}
                  <g fill="#030305">
                    <rect x="70" y="20" width="10" height="10" />
                    <rect x="90" y="20" width="10" height="10" />
                    <rect x="110" y="20" width="10" height="10" />
                    <rect x="70" y="40" width="20" height="10" />
                    <rect x="100" y="40" width="20" height="10" />
                    <rect x="20" y="70" width="20" height="10" />
                    <rect x="50" y="70" width="10" height="20" />
                    <rect x="70" y="70" width="20" height="20" />
                    <rect x="100" y="70" width="30" height="10" />
                    <rect x="140" y="70" width="20" height="20" />
                    <rect x="170" y="70" width="10" height="20" />
                    <rect x="20" y="100" width="30" height="10" />
                    <rect x="60" y="100" width="20" height="10" />
                    <rect x="130" y="100" width="20" height="20" />
                    <rect x="160" y="100" width="20" height="10" />
                    <rect x="70" y="130" width="20" height="20" />
                    <rect x="100" y="130" width="20" height="10" />
                    <rect x="130" y="130" width="20" height="20" />
                    <rect x="70" y="160" width="30" height="10" />
                    <rect x="110" y="160" width="20" height="20" />
                    <rect x="140" y="160" width="20" height="10" />
                    <rect x="170" y="160" width="10" height="20" />
                  </g>

                  {/* WhyCode Center Pill */}
                  <circle cx="100" cy="100" r="16" fill="#030305" />
                  <circle cx="100" cy="100" r="12" fill="#00e5ff" />
                  <path d="M96 94 L104 100 L96 106 Z" fill="#030305" />
                </svg>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-300 font-medium">
              Payable Amount: <span className="font-bold text-cyan-400">${totalAmount.toFixed(2)} USD</span>
            </div>

            <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs">
              <div className="flex items-center justify-center gap-2 text-cyan-300 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>QR expires in:</span>
                <span className="font-mono text-white font-bold">{formatTimer(timerSeconds)}</span>
              </div>
            </div>

            {/* Quick Simulate Button for Testing */}
            <button
              type="button"
              onClick={handlePaySubmit}
              disabled={isProcessing}
              className="mt-3 w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying Payment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  I've Scanned & Paid ${totalAmount.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: UPI ID Input */}
      {upiMode === "id" && (
        <form onSubmit={handlePaySubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Enter Virtual Payment Address (UPI ID) <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="username@okhdfcbank or 9876543210@paytm"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  if (upiError) setUpiError("");
                }}
                className={`w-full px-4 py-2.5 text-sm bg-slate-950/80 border ${
                  upiError ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition-all font-mono`}
              />
            </div>

            {upiError ? (
              <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {upiError}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1.5">
                A collect notification will be sent to your UPI app for authorization.
              </p>
            )}

            {/* Quick Suffix Handles */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              <span className="text-[10px] text-slate-400 font-medium">Quick handles:</span>
              {quickHandles.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => handleApplyHandle(handle)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors font-mono cursor-pointer"
                >
                  {handle}
                </button>
              ))}
            </div>
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
                Sending Collect Request...
              </>
            ) : (
              <>
                Pay ${totalAmount.toFixed(2)}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
