import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Download, 
  ArrowRight, 
  Copy, 
  Check,
  Sparkles,
  GitBranch
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentSuccessModal({
  isOpen,
  onClose,
  paymentResult,
  plan,
  customerData,
  isLoggedIn
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !paymentResult) return null;

  const { method, amount = 40.00, transactionId, orderId, status } = paymentResult;

  const isPending = status === "verification_pending" || method === "bank_transfer";

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = () => {
    onClose();
    navigate("/dashboard");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0a0d18] border border-white/15 shadow-2xl p-6 overflow-hidden text-white">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isPending ? "bg-amber-500/20" : "bg-cyan-500/20"
          }`}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none bg-violet-500/20"
        />

        {/* State Icon & Main Title */}
        <div className="text-center pt-2 pb-4">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg ${
              isPending
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
            }`}
          >
            {isPending ? (
              <Clock className="w-8 h-8" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-cyan-300" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isPending
              ? "Transfer Record Submitted"
              : "Welcome to WhyCode Team!"}
          </h2>

          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {isPending
              ? "Your wire transfer has been recorded. Our automated settlement desk will confirm activation."
              : "Your Team subscription is active. All advanced AI code intelligence features are unlocked."}
          </p>
        </div>

        {/* Dynamic Detail Card */}
        <div className="rounded-xl p-4 bg-slate-950/80 border border-white/10 space-y-2.5 text-xs">
          {/* Status Badge Row */}
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <span className="text-slate-400">Subscription Status</span>
            <span
              className={`font-semibold px-2.5 py-0.5 rounded-full border text-[11px] flex items-center gap-1.5 ${
                isPending
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {isPending ? "Verification Pending" : "Team Plan • Active"}
            </span>
          </div>

          {/* Plan Identifier */}
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Plan</span>
            <span className="font-semibold text-white">
              {plan?.name || "Team"} Plan ($40.00/mo)
            </span>
          </div>

          {/* Transaction ID */}
          {transactionId && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Transaction ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-cyan-300">{transactionId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(transactionId)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Order ID */}
          {orderId && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Order Reference</span>
              <span className="font-mono text-slate-300">{orderId}</span>
            </div>
          )}

          {/* Amount */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Billed Amount</span>
            <span className="font-bold text-white text-sm">${Number(amount).toFixed(2)} USD</span>
          </div>

          {/* Customer / Workspace */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Admin Account</span>
            <span className="font-medium text-slate-200">
              {customerData?.email || "team@workspace.corp"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                alert("Receipt PDF generated and emailed to " + (customerData?.email || "your email"));
              }}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Download Receipt
            </button>
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              Launch Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
