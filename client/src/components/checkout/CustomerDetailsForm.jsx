import React from "react";
import { User, Mail, Building, Lock, CheckCircle2, ShieldAlert } from "lucide-react";

export default function CustomerDetailsForm({
  customerData,
  onChange,
  isLoggedIn,
  user,
  errors = {}
}) {
  if (isLoggedIn) {
    return (
      <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/60 border border-white/10 backdrop-blur-xl mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Workspace Account</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Logged In
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Your subscription will be linked directly to this workspace</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
            <span className="text-slate-400 block text-[11px]">Admin Name</span>
            <span className="text-white font-medium text-sm mt-0.5 block">
              {user?.name || customerData.name}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
            <span className="text-slate-400 block text-[11px]">Billing Email</span>
            <span className="text-white font-medium text-sm mt-0.5 block truncate">
              {user?.email || customerData.email}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
            <span className="text-slate-400 block text-[11px]">Workspace</span>
            <span className="text-cyan-300 font-medium text-sm mt-0.5 block truncate">
              {customerData.companyName || "WhyCode Workspace"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/60 border border-white/10 backdrop-blur-xl mb-6 transition-all">
      <div className="pb-4 border-b border-white/10">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          Billing & Workspace Details
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Enter your details to create your WhyCode workspace after checkout.
        </p>
      </div>

      {/* Form Fields */}
      <div className="mt-4 space-y-4">
        {/* Full Name & Workspace Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Sarah Connor"
                value={customerData.name}
                onChange={(e) => onChange("name", e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-950/80 border ${
                  errors.name ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition-all`}
              />
            </div>
            {errors.name && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Company / Workspace Name <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Acme Engineering"
                value={customerData.companyName}
                onChange={(e) => onChange("companyName", e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-950/80 border ${
                  errors.companyName ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition-all`}
              />
            </div>
            {errors.companyName && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.companyName}
              </p>
            )}
          </div>
        </div>

        {/* Work Email & Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Work Email <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="sarah@acme.corp"
                value={customerData.email}
                onChange={(e) => onChange("email", e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-950/80 border ${
                  errors.email ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition-all`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Set Account Password <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={customerData.password || ""}
                onChange={(e) => onChange("password", e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm bg-slate-950/80 border ${
                  errors.password ? "border-rose-500 ring-1 ring-rose-500" : "border-white/10"
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition-all`}
              />
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.password}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
