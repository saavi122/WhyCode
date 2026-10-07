import React from "react";
import { 
  QrCode, 
  CreditCard, 
  Building2, 
  Wallet, 
  ArrowLeftRight, 
  Zap, 
  Check 
} from "lucide-react";

export const PAYMENT_METHODS = [
  {
    id: "upi",
    title: "UPI / QR",
    subtitle: "Google Pay, PhonePe, Paytm, BHIM & Dynamic QR",
    badge: "Instant & Zero Fee",
    icon: QrCode,
    accent: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-400",
  },
  {
    id: "card",
    title: "Credit / Debit Cards",
    subtitle: "Visa, Mastercard, American Express, RuPay",
    badge: "Auto-Renewal",
    icon: CreditCard,
    accent: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-400",
  },
  {
    id: "netbanking",
    title: "Netbanking",
    subtitle: "All major banks (HDFC, ICICI, SBI, Axis & 50+ more)",
    badge: null,
    icon: Building2,
    accent: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-400",
  },
  {
    id: "wallet",
    title: "Wallets",
    subtitle: "Apple Pay, Google Pay, PhonePe, Paytm, Amazon Pay",
    badge: null,
    icon: Wallet,
    accent: "from-violet-500/20 to-fuchsia-500/20",
    iconColor: "text-violet-400",
  },
  {
    id: "bank_transfer",
    title: "Wire / Bank Transfer",
    subtitle: "Direct ACH / NEFT / Wire with payment reference",
    badge: "Enterprise",
    icon: ArrowLeftRight,
    accent: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
];

export default function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1 mb-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Payment Method
        </label>
        <span className="text-[11px] text-cyan-400 flex items-center gap-1">
          <Zap className="w-3 h-3 text-cyan-400" />
          256-bit Encrypted
        </span>
      </div>

      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelectMethod(method.id)}
              className={`w-full text-left p-3.5 sm:p-4 rounded-xl transition-all duration-200 flex items-center justify-between gap-3 border relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? "bg-slate-900/95 border-cyan-500/60 shadow-[0_0_20px_rgba(0,229,255,0.15)] ring-1 ring-cyan-500/40"
                  : "bg-slate-900/40 hover:bg-slate-900/70 border-white/10 hover:border-white/20 text-slate-300"
              }`}
            >
              {/* Active ambient glow bar */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-violet-500" />
              )}

              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? `bg-gradient-to-tr ${method.accent} border border-cyan-500/40`
                      : "bg-slate-800/60 border border-slate-700/40 group-hover:border-slate-600/60"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isSelected ? method.iconColor : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold tracking-tight transition-colors ${
                        isSelected ? "text-white" : "text-slate-200 group-hover:text-white"
                      }`}
                    >
                      {method.title}
                    </span>
                    {method.badge && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                            : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                        }`}
                      >
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {method.subtitle}
                  </p>
                </div>
              </div>

              {/* Radio Indicator */}
              <div className="shrink-0 flex items-center pl-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 shadow-sm"
                      : "border-slate-700 bg-slate-900/60 group-hover:border-slate-500"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
