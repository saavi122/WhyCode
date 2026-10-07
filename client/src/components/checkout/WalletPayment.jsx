import React, { useState } from "react";
import { 
  Wallet, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Tag, 
  RefreshCw,
  ShieldCheck 
} from "lucide-react";

export const WALLETS = [
  {
    id: "applepay",
    name: "Apple Pay",
    offer: "1-Touch Biometric Checkout",
    color: "from-slate-700/30 to-slate-900/30",
    border: "border-white/20",
    textColor: "text-white"
  },
  {
    id: "googlepay",
    name: "Google Pay",
    offer: "Instant Google Wallet Pay",
    color: "from-blue-600/20 to-indigo-700/20",
    border: "border-blue-500/30",
    textColor: "text-cyan-400"
  },
  {
    id: "phonepe",
    name: "PhonePe Wallet",
    offer: "Direct UPI & Wallet Link",
    color: "from-purple-600/20 to-indigo-700/20",
    border: "border-purple-500/30",
    textColor: "text-purple-400"
  },
  {
    id: "paytm",
    name: "Paytm Wallet",
    offer: "Instant 1-Click Pay",
    color: "from-sky-600/20 to-blue-700/20",
    border: "border-sky-500/30",
    textColor: "text-sky-400"
  },
  {
    id: "amazonpay",
    name: "Amazon Pay",
    offer: "Use Amazon Balance",
    color: "from-amber-600/20 to-orange-700/20",
    border: "border-amber-500/30",
    textColor: "text-amber-400"
  },
];

export default function WalletPayment({
  totalAmount = 40.00,
  onPay,
  isProcessing = false
}) {
  const [selectedWallet, setSelectedWallet] = useState("applepay");

  const activeWallet = WALLETS.find((w) => w.id === selectedWallet) || WALLETS[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    onPay({
      method: "wallet",
      walletName: activeWallet.name,
      amount: totalAmount,
    });
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/60 border border-white/10 backdrop-blur-xl transition-all">
      <div className="pb-4 border-b border-white/10">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Choose Digital Wallet
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Fast and secure 1-click subscription payments
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WALLETS.map((wallet) => {
            const isSelected = selectedWallet === wallet.id;
            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => setSelectedWallet(wallet.id)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex items-start justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900/90 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-sm"
                    : "bg-slate-950/60 hover:bg-slate-900/60 border-white/10 text-slate-300"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold bg-gradient-to-tr ${wallet.color} border ${wallet.border} ${wallet.textColor}`}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white block">
                      {wallet.name}
                    </span>
                    <span className="text-[11px] text-cyan-300 flex items-center gap-1 mt-0.5">
                      <Tag className="w-2.5 h-2.5" />
                      {wallet.offer}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 shadow-sm"
                      : "border-slate-700 bg-slate-900/60"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Wallet Information */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300 flex items-center justify-between">
          <span>You will complete payment through <span className="font-semibold text-white">{activeWallet.name}</span>.</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
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
              Opening {activeWallet.name}...
            </>
          ) : (
            <>
              Pay ${totalAmount.toFixed(2)} with {activeWallet.name}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
