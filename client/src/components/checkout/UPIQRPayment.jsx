import React, { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  RefreshCw, 
  Copy, 
  Check, 
  AlertCircle, 
  ExternalLink,
  Smartphone,
  QrCode,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { 
  createPaymentTransaction, 
  getSavedActiveTransaction, 
  saveActiveTransaction, 
  clearActiveTransaction,
  checkPaymentStatus 
} from "../../services/paymentService";

/**
 * Real Dynamic UPI / QR Payment Flow Component
 */
export default function UPIQRPayment({
  planName = "Startup",
  planId = "startup",
  amount = 10.00,
  currency = "$",
  onPaymentSuccess,
  onValidityChange,
  isParentProcessing = false
}) {
  const [upiMode, setUpiMode] = useState("qr"); // "qr" | "id"
  const [manualUpiId, setManualUpiId] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(0);

  // Transaction state
  const [transaction, setTransaction] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [qrState, setQrState] = useState("active"); // "generating" | "active" | "expired" | "success" | "failed"

  // Polling ref
  const pollingTimerRef = useRef(null);

  // 1. Initialize or restore transaction from session
  const initializeTransaction = useCallback(async (forceNew = false) => {
    setIsGenerating(true);
    try {
      if (!forceNew) {
        const saved = getSavedActiveTransaction();
        if (
          saved &&
          saved.planId === planId &&
          Math.abs(Number(saved.amount) - Number(amount)) < 0.01 &&
          saved.expiresAt > Date.now()
        ) {
          setTransaction(saved);
          const rem = Math.max(0, Math.floor((saved.expiresAt - Date.now()) / 1000));
          setRemainingSeconds(rem);
          setQrState("active");
          setIsGenerating(false);
          return;
        }
      }

      // Generate a fresh transaction
      const newTxn = await createPaymentTransaction({
        planId,
        planName,
        amount
      });
      setTransaction(newTxn);
      setRemainingSeconds(Math.max(0, Math.floor((newTxn.expiresAt - Date.now()) / 1000)));
      setQrState("active");
      setLastGeneratedAt(Date.now());
    } catch (err) {
      console.error("Failed to generate UPI transaction:", err);
      setQrState("failed");
    } finally {
      setIsGenerating(false);
    }
  }, [planId, planName, amount]);

  // Init on mount or when amount / plan changes
  useEffect(() => {
    initializeTransaction(false);
  }, [initializeTransaction]);

  // 2. Countdown Timer derived from transaction.expiresAt
  useEffect(() => {
    if (!transaction || qrState !== "active") return;

    const tick = () => {
      const diff = Math.floor((transaction.expiresAt - Date.now()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        setQrState("expired");
        if (onValidityChange) onValidityChange(false);
      } else {
        setRemainingSeconds(diff);
        if (onValidityChange) onValidityChange(true);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [transaction, qrState, onValidityChange]);

  // 3. Payment Status Polling
  useEffect(() => {
    if (!transaction || qrState !== "active") {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    const poll = async () => {
      try {
        const res = await checkPaymentStatus(transaction.transactionId);
        if (res?.status === "SUCCESS") {
          setQrState("success");
          clearActiveTransaction();
          if (onPaymentSuccess) {
            onPaymentSuccess({
              transactionId: transaction.transactionId,
              orderId: transaction.orderId,
              amount: transaction.amount,
              method: "upi"
            });
          }
        }
      } catch (_) {}
    };

    pollingTimerRef.current = setInterval(poll, 4000);
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [transaction, qrState, onPaymentSuccess]);

  // Handle Manual Refresh / Generate New QR with Rate Limiting (2s debounce)
  const handleGenerateNewQR = () => {
    const now = Date.now();
    if (now - lastGeneratedAt < 2000 || isGenerating) return;
    initializeTransaction(true);
  };

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Copy helpers
  const handleCopy = (type) => {
    const text = type === "upi" ? "whycode.pay@icici" : (transaction?.upiPayload || transaction?.orderId || "");
    try {
      navigator.clipboard.writeText(text);
      if (type === "upi") {
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 1500);
      } else {
        setCopiedQr(true);
        setTimeout(() => setCopiedQr(false), 1500);
      }
    } catch (_) {}
  };

  // UPI Deep link for Mobile Web
  const isMobile = typeof window !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent);

  return (
    <div className="space-y-4">
      {/* Header bar: Title and Segmented Switch */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-[#f2f6fb]">Pay using UPI</h3>
          <p className="text-xs text-[#a3afbf] mt-0.5">
            Scan the dynamic QR with any supported UPI app or enter UPI ID.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Segmented Toggle (160px wide) */}
          <div className="flex bg-[#060a11] border border-white/10 rounded-lg p-0.5 w-[160px] h-8">
            <button
              type="button"
              onClick={() => setUpiMode("id")}
              className={`flex-1 h-full rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                upiMode === "id" ? "bg-[#0a84ff] text-white" : "text-[#a3afbf] hover:text-white"
              }`}
            >
              UPI ID
            </button>
            <button
              type="button"
              onClick={() => setUpiMode("qr")}
              className={`flex-1 h-full rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                upiMode === "qr" ? "bg-[#0a84ff] text-white" : "text-[#a3afbf] hover:text-white"
              }`}
            >
              Scan QR
            </button>
          </div>

          {upiMode === "qr" && qrState === "active" && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateNewQR}
              className="h-[34px] px-3 rounded-lg border border-white/10 bg-[#060a11] hover:border-[#17d1ff] text-[#17d1ff] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
              <span>↻ Generate new QR</span>
            </button>
          )}
        </div>
      </div>

      {upiMode === "qr" ? (
        <div>
          {/* QR Container (max-width 290px, centered) */}
          <div className="max-w-[290px] mx-auto bg-[#060a11] border border-white/10 rounded-xl p-4 text-center flex flex-col items-center gap-2 shadow-inner relative overflow-hidden">
            
            {/* Ambient subtle glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#17d1ff]/10 rounded-full blur-2xl pointer-events-none" />

            {/* STATE 1: ACTIVE SCANNABLE QR */}
            {qrState === "active" && (
              <>
                {/* 180px white high-contrast QR block */}
                <div className="w-[180px] h-[180px] bg-white rounded-lg p-2.5 shadow-md flex items-center justify-center shrink-0">
                  {transaction?.upiPayload ? (
                    <QRCodeSVG
                      value={transaction.upiPayload}
                      size={160}
                      level="M"
                      includeMargin={false}
                      className="w-full h-full block"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      Generating...
                    </div>
                  )}
                </div>

                <div className="text-[26px] font-bold text-[#f2f6fb] mt-1">
                  {currency}{Number(amount).toFixed(2)}
                </div>
                <div className="text-xs text-[#17d1ff] font-bold uppercase tracking-wide">
                  WHYCODE {planName.toUpperCase()} COVER
                </div>
                <div className="font-mono text-xs text-[#a3afbf]">
                  Ref: {transaction?.orderId || "WHY-ORDER"}
                </div>
                
                <div className="text-xs text-[#f2f6fb] font-mono">
                  ⏱ QR expires in <b className="font-semibold text-white">{formatTime(remainingSeconds)}</b>
                </div>

                <div className="flex items-center gap-1.5 text-[#17d1ff] font-medium text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#17d1ff] animate-pulse" />
                  <span>Waiting for payment…</span>
                </div>
              </>
            )}

            {/* STATE 2: EXPIRED STATE */}
            {qrState === "expired" && (
              <div className="py-4 px-2 w-full flex flex-col items-center text-center animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-[#f2f6fb] uppercase tracking-wider">
                  QR Code Expired
                </h4>
                <p className="text-xs text-[#a3afbf] my-2 leading-relaxed">
                  This payment QR has expired for security. Please generate a fresh QR to complete your checkout.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateNewQR}
                  disabled={isGenerating}
                  className="mt-2 w-full h-10 rounded-lg bg-[#0a84ff] hover:bg-[#0074e0] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                  <span>GENERATE NEW QR</span>
                </button>
              </div>
            )}

            {/* STATE 3: PAYMENT SUCCESS STATE */}
            {qrState === "success" && (
              <div className="py-4 px-2 w-full flex flex-col items-center text-center animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-[#34d399]/10 border border-[#34d399]/30 flex items-center justify-center text-[#34d399] mb-2 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-[#34d399] uppercase tracking-wider">
                  ✓ Payment Successful
                </h4>
                <p className="text-base font-bold text-white mt-1">
                  {currency}{Number(amount).toFixed(2)} paid
                </p>
                <p className="text-xs text-[#a3afbf] font-mono mt-1">
                  Txn: {transaction?.transactionId}
                </p>
                <p className="text-xs text-[#a3afbf] mt-2">
                  Your WhyCode coverage is being activated.
                </p>
              </div>
            )}
          </div>

          {/* Supported apps line */}
          <p className="text-center text-xs text-[#a3afbf] my-3">
            Google Pay · PhonePe · Paytm · BHIM · Amazon Pay
          </p>

          {/* Mobile UPI Deep Link CTA if on mobile */}
          {isMobile && qrState === "active" && transaction?.upiPayload && (
            <div className="flex justify-center mb-3">
              <a
                href={transaction.upiPayload}
                className="h-10 px-5 rounded-lg bg-[#17d1ff]/10 hover:bg-[#17d1ff]/20 border border-[#17d1ff]/40 text-[#17d1ff] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay using UPI App</span>
              </a>
            </div>
          )}

          {/* Action buttons: Copy UPI ID & Copy QR */}
          {qrState === "active" && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleCopy("upi")}
                className="h-10 px-4 rounded-lg border border-white/10 bg-[#060a11] hover:border-[#17d1ff] text-xs font-semibold text-[#f2f6fb] flex items-center gap-2 transition-all cursor-pointer"
              >
                {copiedUpi ? <Check className="w-4 h-4 text-[#34d399]" /> : <Copy className="w-4 h-4 text-[#17d1ff]" />}
                <span>{copiedUpi ? "Copied" : "Copy UPI ID"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy("qr")}
                className="h-10 px-4 rounded-lg border border-white/10 bg-[#060a11] hover:border-[#17d1ff] text-xs font-semibold text-[#f2f6fb] flex items-center gap-2 transition-all cursor-pointer"
              >
                {copiedQr ? <Check className="w-4 h-4 text-[#34d399]" /> : <Copy className="w-4 h-4 text-[#17d1ff]" />}
                <span>{copiedQr ? "Copied" : "Copy QR Payload"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* UPI ID / VPA Mode */
        <div className="bg-[#060a11] border border-white/10 rounded-xl p-5 text-center my-3">
          <div className="max-w-[360px] mx-auto text-left">
            <label className="block text-[11px] uppercase font-semibold text-[#a3afbf] mb-1.5">
              ENTER YOUR UPI ID / VPA
            </label>
            <input
              placeholder="e.g. yourname@okhdfcbank"
              value={manualUpiId}
              onChange={(e) => setManualUpiId(e.target.value)}
              className="w-full h-10 bg-[#0b121c] border border-white/10 rounded-lg px-3 text-xs text-[#f2f6fb] font-mono outline-none focus:border-[#17d1ff] focus:ring-1 focus:ring-[#17d1ff] transition-all"
            />
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {["@okhdfcbank", "@okaxis", "@okicici", "@ybl", "@paytm"].map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => {
                    const prefix = manualUpiId.split("@")[0] || "username";
                    setManualUpiId(`${prefix}${handle}`);
                  }}
                  className="px-2 py-1 bg-[#0b121c] border border-white/5 hover:border-[#17d1ff]/40 rounded text-[10px] text-[#a3afbf] hover:text-[#17d1ff] font-mono cursor-pointer transition-all"
                >
                  {handle}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
