import React, { useState } from "react";
import { 
  Building2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ExternalLink,
  RefreshCw 
} from "lucide-react";

export const POPULAR_BANKS = [
  { id: "hdfc", name: "HDFC Bank", fullName: "HDFC Bank", code: "HDFC", color: "from-blue-700/20 to-indigo-900/20", border: "border-indigo-500/30" },
  { id: "icici", name: "ICICI Bank", fullName: "ICICI Bank", code: "ICIC", color: "from-orange-600/20 to-amber-700/20", border: "border-orange-500/30" },
  { id: "sbi", name: "SBI", fullName: "State Bank of India", code: "SBIN", color: "from-blue-600/20 to-blue-800/20", border: "border-blue-500/30" },
  { id: "axis", name: "Axis Bank", fullName: "Axis Bank", code: "UTIB", color: "from-rose-600/20 to-pink-800/20", border: "border-rose-500/30" },
  { id: "kotak", name: "Kotak Mahindra", fullName: "Kotak Mahindra Bank", code: "KKBK", color: "from-red-600/20 to-rose-700/20", border: "border-red-500/30" },
  { id: "chase", name: "J.P. Morgan Chase", fullName: "Chase Commercial Bank", code: "JPMC", color: "from-blue-800/20 to-cyan-900/20", border: "border-cyan-500/30" },
];

export const ALL_BANKS = [
  "Bank of America",
  "Bank of Baroda",
  "Bank of India",
  "Barclays Bank",
  "Canara Bank",
  "Citibank Commercial",
  "Deutsche Bank",
  "Federal Bank",
  "HSBC Corporate",
  "IDFC FIRST Bank",
  "IndusInd Bank",
  "Standard Chartered Bank",
  "Union Bank of India",
  "Wells Fargo",
  "Yes Bank"
];

export default function NetbankingPayment({
  totalAmount = 40.00,
  onPay,
  isProcessing = false
}) {
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const activeBankObj = POPULAR_BANKS.find((b) => b.id === selectedBank);
  const activeBankName = activeBankObj ? activeBankObj.fullName : selectedBank;

  const filteredBanks = ALL_BANKS.filter((b) =>
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBank) {
      setError("Please select a bank to proceed");
      return;
    }
    setError("");
    onPay({
      method: "netbanking",
      bankName: activeBankName,
      amount: totalAmount,
    });
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/60 border border-white/10 backdrop-blur-xl transition-all">
      <div className="pb-4 border-b border-white/10">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Pay via Corporate or Retail Netbanking
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Select your bank to redirect to authorized banking gateway
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Popular Banks Grid */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Popular Banks
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {POPULAR_BANKS.map((bank) => {
              const isSelected = selectedBank === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => {
                    setSelectedBank(bank.id);
                    setError("");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900/90 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-sm"
                      : "bg-slate-950/60 hover:bg-slate-900/60 border-white/10 text-slate-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[11px] bg-gradient-to-tr ${bank.color} border ${bank.border} text-white`}
                  >
                    {bank.code.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white block truncate">
                      {bank.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Direct Login</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* All Banks Search / Dropdown */}
        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Or search other institutions
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bank name (e.g. Barclays, Citibank, Wells Fargo)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950/80 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {searchQuery && (
            <div className="mt-2 max-h-36 overflow-y-auto bg-slate-950 border border-white/10 rounded-xl p-1 space-y-1">
              {filteredBanks.length > 0 ? (
                filteredBanks.map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => {
                      setSelectedBank(bank);
                      setSearchQuery("");
                      setError("");
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    {bank}
                  </button>
                ))
              ) : (
                <div className="text-center py-2 text-xs text-slate-500">
                  No bank matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Bank Banner */}
        {selectedBank && (
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-400">Selected bank:</span>{" "}
                <span className="font-semibold text-white">{activeBankName}</span>
              </div>
            </div>
            <span className="text-[11px] text-cyan-300 font-medium flex items-center gap-1">
              Direct Portal <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}

        {/* Primary CTA */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-[0_0_25px_rgba(0,229,255,0.25)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Connecting to {activeBankName}...
            </>
          ) : (
            <>
              Continue to {activeBankName} (${totalAmount.toFixed(2)})
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
