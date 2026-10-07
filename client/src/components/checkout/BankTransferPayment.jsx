import React, { useState } from "react";
import { 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  RefreshCw,
  Sparkles
} from "lucide-react";

export default function BankTransferPayment({
  totalAmount = 40.00,
  onPay,
  isProcessing = false,
  orderId = "WHY-TEAM-ORD"
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [error, setError] = useState("");

  const bankDetails = {
    bankName: "Silicon Valley Bank / First Republic",
    branch: "Enterprise Banking Division, San Francisco, CA",
    accountName: "WhyCode Technologies Inc.",
    accountNumber: "94820194820194",
    routingNumber: "121000358",
    swiftBic: "SVBUS6SXXX",
    paymentReference: orderId || "WHY-TEAM-SUBSCRIPTION",
  };

  const copyToClipboard = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setError("Please enter the wire confirmation / transfer reference number");
      return;
    }
    if (utrNumber.trim().length < 4) {
      setError("Please enter a valid reference number");
      return;
    }
    setError("");
    onPay({
      method: "bank_transfer",
      utrNumber: utrNumber.trim(),
      receiptFileName: receiptFile ? receiptFile.name : null,
      paymentReference: bankDetails.paymentReference,
      amount: totalAmount,
    });
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/60 border border-white/10 backdrop-blur-xl transition-all">
      <div className="pb-4 border-b border-white/10">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Pay via Wire / Bank Transfer
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Transfer via ACH, SWIFT, or Wire with instant auto-reconciliation
        </p>
      </div>

      {/* Prominent Payment Reference Highlight */}
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Transfer Reference Note (Required)
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              Please include this reference in your wire memo/notes:
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-amber-500/40">
            <span className="font-mono font-bold text-sm text-amber-300">
              {bankDetails.paymentReference}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(bankDetails.paymentReference, "ref")}
              className="text-xs text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              title="Copy Reference ID"
            >
              {copiedField === "ref" ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bank Account Details Table */}
      <div className="mt-4 rounded-xl bg-slate-950/80 border border-white/10 divide-y divide-white/5 text-xs">
        <div className="p-3 flex justify-between items-center">
          <span className="text-slate-400">Beneficiary Name</span>
          <span className="font-semibold text-white text-right">{bankDetails.accountName}</span>
        </div>

        <div className="p-3 flex justify-between items-center">
          <span className="text-slate-400">Bank & Branch</span>
          <span className="font-medium text-slate-200 text-right">{bankDetails.bankName}</span>
        </div>

        <div className="p-3 flex justify-between items-center">
          <span className="text-slate-400">Account Number</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white tracking-wider">{bankDetails.accountNumber}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(bankDetails.accountNumber, "acc")}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedField === "acc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedField === "acc" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="p-3 flex justify-between items-center">
          <span className="text-slate-400">Routing / SWIFT</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white">{bankDetails.swiftBic}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(bankDetails.swiftBic, "swift")}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedField === "swift" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedField === "swift" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="p-3 flex justify-between items-center bg-slate-900/40">
          <span className="text-slate-400 font-medium">Total Amount Due</span>
          <span className="font-bold text-cyan-400 text-sm">${totalAmount.toFixed(2)} USD</span>
        </div>
      </div>

      {/* Submission Form: Reference & Receipt */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Wire Reference / Transaction Number <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. WIRE-89219401 or IMPS reference"
            value={utrNumber}
            onChange={(e) => {
              setUtrNumber(e.target.value);
              if (error) setError("");
            }}
            className={`w-full px-4 py-2.5 text-sm bg-slate-950/80 border ${
              error ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
            } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none font-mono transition-all`}
          />
          {error && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>

        {/* Optional Receipt Upload */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Attach Transfer Confirmation Slip <span className="text-slate-500">(Optional)</span>
          </label>
          <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl bg-slate-950/60 cursor-pointer transition-colors group">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 mb-1.5 transition-colors" />
            <span className="text-xs text-slate-300 font-medium">
              {receiptFile ? receiptFile.name : "Click to attach screenshot or PDF slip"}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Max 10MB (PNG, JPG, PDF)</span>
          </label>
        </div>

        {/* Helper Note */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Once submitted, your workspace will be provisioned in pending status and fully confirmed within 15–30 minutes upon wire settlement.
          </span>
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
              Recording Transfer...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              I've Completed the Transfer
            </>
          )}
        </button>
      </form>
    </div>
  );
}
