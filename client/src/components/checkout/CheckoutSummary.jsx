import React from "react";
import { 
  GitBranch, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  Check, 
  Layers,
  ArrowRight,
  Info
} from "lucide-react";

export default function CheckoutSummary({
  plan,
  customerData,
  paymentMethod,
  breakdown,
  onSelectPlan,
  isLoggedIn,
  orderId
}) {
  const {
    name = "Team",
    formattedPrice = "$40",
    period = "/month",
    description = "Advanced intelligence & collaboration for scaling engineering teams.",
    target = "Teams with 25–50 developers",
    members = "25–50 members",
    repositories = "Expanded repos",
    features = [
      "Full deep repository indexing",
      "Real-time drift detection & alerts",
      "Developer management & dashboards",
      "Team & repository analytics",
      "Priority support & increased quotas"
    ]
  } = plan || {};

  return (
    <div className="flex flex-col gap-5">
      {/* Plan Summary Card */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-slate-900/90 via-[#0a0d18]/80 to-[#030305]/95 border border-white/10 shadow-2xl backdrop-blur-xl text-white">
        {/* Ambient brand glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-violet-500/20 border border-cyan-500/40 flex items-center justify-center shadow-inner">
              <GitBranch className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">WhyCode Subscription</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Instant Provisioning
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{name} Plan</h2>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {description}
        </p>

        {/* Plan Limits Pill Grid */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
          <div className="bg-slate-950/60 rounded-lg p-2.5 border border-white/5">
            <span className="text-[10px] uppercase font-medium text-slate-400 block">Team Capacity</span>
            <span className="text-sm font-semibold text-white tracking-tight">{members}</span>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2.5 border border-white/5">
            <span className="text-[10px] uppercase font-medium text-slate-400 block">Repositories</span>
            <span className="text-sm font-semibold text-cyan-300 tracking-tight">{repositories}</span>
          </div>
        </div>

        {/* Feature Highlights List */}
        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Included in {name}:
          </span>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-cyan-300" />
                </div>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Customer Snapshot */}
      <div className="rounded-xl p-4 bg-slate-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer Details</span>
          <span className="text-xs text-cyan-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            {isLoggedIn ? "Verified Workspace" : "New Account"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {customerData?.name || "Developer"}
            </p>
            <p className="text-xs text-slate-400">
              {customerData?.email || "Workspace admin email"}
            </p>
          </div>
          {customerData?.companyName && (
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-200">
              {customerData.companyName}
            </span>
          )}
        </div>
        {orderId && (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Order ID:</span>
            <span className="font-mono text-cyan-400">{orderId}</span>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="rounded-xl p-5 bg-slate-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Price Breakdown</span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Monthly Cadence
          </span>
        </div>

        <div className="space-y-2.5 text-xs text-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Base Subscription ({name})</span>
            <span className="font-medium text-slate-200">${breakdown.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1">
              Estimated Tax (0%)
              <Info className="w-3 h-3 text-slate-500" />
            </span>
            <span className="font-medium text-slate-200">${breakdown.tax.toFixed(2)}</span>
          </div>

          <div className="pt-3 mt-2 border-t border-white/10 flex justify-between items-baseline">
            <div>
              <span className="text-sm font-semibold text-white block">Total Due Today</span>
              <span className="text-[11px] text-slate-400">
                Billed monthly · Cancel anytime
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
                ${breakdown.total.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">/mo</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges & Guarantee */}
      <div className="rounded-xl p-4 bg-slate-900/40 border border-white/5 space-y-2.5">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <span className="font-medium text-white">256-bit Bank-Grade Encryption</span>
            <p className="text-[11px] text-slate-400">PCI-DSS Level 1 compliant secure payment processing</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <span className="font-medium text-white">14-Day Money-Back Guarantee</span>
            <p className="text-[11px] text-slate-400">If WhyCode doesn't meet your team's needs, get a full refund</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <span className="font-medium text-white">Instant AST Indexing Access</span>
            <p className="text-[11px] text-slate-400">Unlock full repository analysis and team features immediately</p>
          </div>
        </div>
      </div>
    </div>
  );
}
