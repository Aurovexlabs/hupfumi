import { Spinner } from "@/components/common/LoadingScreen";
import {
  useInitiateDeposit,
  useMyWallet,
  useTransactions,
} from "@/hooks/useApi";
import api from "@/lib/api";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  Minus,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ModalType = "deposit" | "withdraw" | null;
type DepositMethod = "ecocash" | "paynow" | "bank";

type ActiveDeposit = {
  reference: string;
  amount: number;
  method: DepositMethod | string;
  redirectUrl: string | null;
  instructions: string | null;
  pollUrl: string | null;
  status: string;
  externalStatus: string | null;
};

type DepositStatusPayload = {
  reference: string;
  status: string;
  externalStatus?: string | null;
  pollUrl?: string | null;
};

const TERMINAL_DEPOSIT_STATUSES = new Set(["completed", "failed"]);

const normalizeStatus = (value?: string | null) =>
  String(value || "pending")
    .trim()
    .toLowerCase();

const formatStatusLabel = (value?: string | null) =>
  normalizeStatus(value).replace(/_/g, " ");

export default function WalletPage() {
  const qc = useQueryClient();
  const { data: wallet, isLoading, refetch } = useMyWallet();
  const { data: txData } = useTransactions();
  const deposit = useInitiateDeposit();
  const w = wallet as any;
  const txns: any[] =
    (txData as any)?.transactions ?? (txData as any)?.data?.transactions ?? [];
  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<DepositMethod>("ecocash");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<ActiveDeposit | null>(
    null,
  );

  const hasHandledReturnRef = useRef(false);
  const lastNotifiedDepositStatusRef = useRef<string | null>(null);

  const activeDepositReference = activeDeposit?.reference ?? "";
  const shouldPollDeposit =
    Boolean(activeDepositReference) &&
    !TERMINAL_DEPOSIT_STATUSES.has(normalizeStatus(activeDeposit?.status));

  const depositStatusQuery = useQuery({
    queryKey: ["wallet-deposit-status", activeDepositReference],
    queryFn: () =>
      api
        .get(`/wallet/deposit/${activeDepositReference}/status`)
        .then((r) => r.data.data as DepositStatusPayload),
    enabled: Boolean(activeDepositReference),
    refetchInterval: shouldPollDeposit ? 5000 : false,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 0,
  });

  const close = () => {
    setModal(null);
    setAmount("");
    setPhone("");
  };

  const openPaynowCheckout = () => {
    if (!activeDeposit?.redirectUrl) return;

    const popup = window.open(
      activeDeposit.redirectUrl,
      "_blank",
      "noopener,noreferrer",
    );

    if (!popup) {
      toast.info("Popup blocked. Use the checkout link to continue payment.");
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount < 1) {
      toast.error("Minimum deposit is $1");
      return;
    }

    try {
      const initiated = await deposit.mutateAsync({
        amount: parsedAmount,
        method,
        ...(phone && { phone }),
      });

      if (initiated?.reference) {
        setActiveDeposit({
          reference: initiated.reference,
          amount: parsedAmount,
          method,
          redirectUrl: initiated.redirectUrl ?? null,
          instructions: initiated.instructions ?? null,
          pollUrl: initiated.pollUrl ?? null,
          status: normalizeStatus(initiated.status),
          externalStatus: normalizeStatus(
            initiated.externalStatus ?? initiated.status,
          ),
        });
        lastNotifiedDepositStatusRef.current = null;
      }

      close();
      refetch();
      qc.invalidateQueries({ queryKey: ["transactions"] });

      if (initiated?.redirectUrl) {
        const popup = window.open(
          initiated.redirectUrl,
          "_blank",
          "noopener,noreferrer",
        );

        if (!popup) {
          toast.info("Popup blocked. Tap 'Continue to Paynow' to proceed.");
        } else {
          toast.info("Paynow checkout opened in a new tab.");
        }
      } else if (initiated?.instructions) {
        toast.message("Follow the mobile payment prompt to complete deposit.");
      }
    } catch {}
  };
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number(amount) || Number(amount) < 1) {
      toast.error("Minimum withdrawal is $1");
      return;
    }
    setLoading(true);
    try {
      await api.post("/wallet/withdraw", {
        amount: Number(amount),
        methodIndex: 0,
      });
      toast.success("Withdrawal submitted!");
      close();
      refetch();
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasHandledReturnRef.current) return;
    hasHandledReturnRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (!reference) return;

    const returnStatus = normalizeStatus(params.get("status"));

    setActiveDeposit({
      reference,
      amount: 0,
      method: "paynow",
      redirectUrl: null,
      instructions: null,
      pollUrl: params.get("pollurl"),
      status: returnStatus,
      externalStatus: returnStatus,
    });
    lastNotifiedDepositStatusRef.current = null;
    toast.info("Returned from Paynow. Verifying your deposit status...");

    const cleaned = new URL(window.location.href);
    ["reference", "status", "pollurl", "paynowreference"].forEach((key) => {
      cleaned.searchParams.delete(key);
    });

    window.history.replaceState(
      {},
      "",
      `${cleaned.pathname}${cleaned.search}${cleaned.hash}`,
    );
  }, []);

  useEffect(() => {
    if (!depositStatusQuery.data) return;

    const nextStatus = normalizeStatus(depositStatusQuery.data.status);
    const nextExternalStatus = depositStatusQuery.data.externalStatus
      ? normalizeStatus(depositStatusQuery.data.externalStatus)
      : null;

    setActiveDeposit((prev) => {
      if (!prev || prev.reference !== depositStatusQuery.data?.reference) {
        return prev;
      }

      const next = {
        ...prev,
        status: nextStatus,
        externalStatus: nextExternalStatus ?? prev.externalStatus,
        pollUrl: depositStatusQuery.data.pollUrl ?? prev.pollUrl,
      };

      const unchanged =
        prev.status === next.status &&
        prev.externalStatus === next.externalStatus &&
        prev.pollUrl === next.pollUrl;

      return unchanged ? prev : next;
    });

    if (lastNotifiedDepositStatusRef.current === nextStatus) return;
    lastNotifiedDepositStatusRef.current = nextStatus;

    if (nextStatus === "completed") {
      toast.success("Deposit completed and wallet balance updated.");
      refetch();
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      return;
    }

    if (nextStatus === "failed") {
      toast.error("Deposit failed or was cancelled.");
      refetch();
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
  }, [depositStatusQuery.data, qc, refetch]);

  const currentDepositStatus = normalizeStatus(
    depositStatusQuery.data?.status ?? activeDeposit?.status,
  );
  const currentExternalStatus =
    depositStatusQuery.data?.externalStatus ?? activeDeposit?.externalStatus;
  const isDepositTerminal = TERMINAL_DEPOSIT_STATUSES.has(currentDepositStatus);

  const depositStatusBadge = cn(
    "badge capitalize",
    currentDepositStatus === "completed"
      ? "badge-green"
      : currentDepositStatus === "failed"
        ? "badge-red"
        : "badge-gray",
  );

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} className="text-brand-orange" />
      </div>
    );

  return (
    <div className="page-container py-10 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Wallet</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            Manage balances, payouts, deposits, and transaction history.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModal("deposit")}
            className="btn-primary"
          >
            <Plus size={14} />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setModal("withdraw")}
            className="btn-secondary"
          >
            <Minus size={14} />
            Withdraw
          </button>
        </div>
      </div>

      {activeDeposit && (
        <div className="card mb-6 p-4 border-brand-orange/30 bg-orange-50/40 dark:bg-orange-950/10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-text-primary dark:text-white">
                Deposit reference {activeDeposit.reference}
              </p>
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                {activeDeposit.amount > 0
                  ? `${formatCurrency(activeDeposit.amount)} via ${activeDeposit.method}`
                  : "Payment return received. Confirming final status..."}
              </p>
            </div>
            <span className={depositStatusBadge}>
              {formatStatusLabel(currentDepositStatus)}
            </span>
          </div>

          {activeDeposit.instructions && (
            <p className="text-xs text-text-secondary dark:text-slate-300 mb-2">
              {activeDeposit.instructions}
            </p>
          )}

          {currentExternalStatus &&
            currentExternalStatus !== currentDepositStatus && (
              <p className="text-xs text-text-tertiary dark:text-slate-500 mb-2 capitalize">
                Provider status: {formatStatusLabel(currentExternalStatus)}
              </p>
            )}

          {depositStatusQuery.isError && (
            <p className="text-xs text-red-500 mb-2">
              Could not refresh deposit status right now. You can retry
              manually.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {activeDeposit.redirectUrl && !isDepositTerminal && (
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={openPaynowCheckout}
              >
                <ExternalLink size={12} />
                Continue to Paynow
              </button>
            )}

            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => depositStatusQuery.refetch()}
              disabled={depositStatusQuery.isFetching}
            >
              {depositStatusQuery.isFetching ? (
                <>
                  <Spinner size={12} className="text-text-primary" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  Check status
                </>
              )}
            </button>

            {isDepositTerminal && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setActiveDeposit(null)}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Available Balance",
            amount: w?.balance ?? 0,
            icon: Wallet,
            color: "text-brand-green",
            bg: "bg-green-50 dark:bg-green-950/30",
            primary: true,
          },
          {
            label: "Pending (Escrow)",
            amount: w?.pendingBalance ?? 0,
            icon: Clock,
            color: "text-brand-amber",
            bg: "bg-amber-50 dark:bg-amber-950/30",
            primary: false,
          },
          {
            label: "Withdrawable",
            amount: w?.withdrawableBalance ?? 0,
            icon: ArrowUpRight,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/30",
            primary: false,
          },
        ].map(({ label, amount, icon: Icon, color, bg, primary }) => (
          <div
            key={label}
            className={cn("card p-6", primary && "border-brand-green/30")}
          >
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center mb-4",
                bg,
              )}
            >
              <Icon size={20} className={color} />
            </div>
            <p className="text-xs font-medium text-text-tertiary dark:text-slate-500 mb-1">
              {label}
            </p>
            <p
              className={cn(
                "font-display font-bold text-2xl",
                primary
                  ? "text-brand-green"
                  : "text-text-primary dark:text-white",
              )}
            >
              {formatCurrency(amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: "Total Earned",
            value: formatCurrency(w?.totalEarned ?? 0),
            color: "text-brand-green",
          },
          {
            label: "Total Spent",
            value: formatCurrency(w?.totalSpent ?? 0),
            color: "text-red-500 dark:text-red-400",
          },
          {
            label: "Total Deposited",
            value: formatCurrency(w?.totalDeposited ?? 0),
            color: "text-blue-600",
          },
          {
            label: "Total Withdrawn",
            value: formatCurrency(w?.totalWithdrawn ?? 0),
            color: "text-brand-orange",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-text-tertiary dark:text-slate-500 mb-1">
              {label}
            </p>
            <p className={cn("font-bold text-base", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Escrow notice */}
      <div className="card mb-8 p-4 flex items-start gap-3 border-brand-green/20 bg-green-50/40 dark:bg-green-950/10">
        <Shield size={18} className="text-brand-green shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-text-primary dark:text-white">
            Funds are escrow-protected
          </p>
          <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5">
            Buyer funds stay secure until completion is confirmed, protecting
            both parties on every eligible transaction.
          </p>
        </div>
      </div>

      <div className="card mb-8 p-5">
        <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-widest mb-3">
          How your wallet works
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              t: "1. Add or receive funds",
              d: "Deposit directly or receive payouts from completed orders.",
              i: Plus,
              c: "text-blue-600",
            },
            {
              t: "2. Escrow secures transactions",
              d: "Order payments remain protected until delivery is confirmed.",
              i: Shield,
              c: "text-brand-green",
            },
            {
              t: "3. Withdraw safely",
              d: "Submit withdrawal requests from your withdrawable balance.",
              i: ArrowUpRight,
              c: "text-brand-orange",
            },
          ].map(({ t, d, i: Icon, c }) => (
            <div
              key={t}
              className="rounded-xl border border-surface-200 dark:border-dark-border p-3"
            >
              <p className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2">
                <Icon size={14} className={c} /> {t}
              </p>
              <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                {d}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-dark-border">
          <h2 className="font-semibold text-text-primary dark:text-white">
            Transaction History
          </h2>
          {txns.length > 0 && (
            <span className="badge badge-gray">{txns.length}</span>
          )}
        </div>
        {txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-surface-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp
                size={24}
                className="text-text-tertiary dark:text-slate-500"
              />
            </div>
            <p className="font-semibold text-text-primary dark:text-white text-sm">
              No transactions yet
            </p>
            <p className="text-text-tertiary dark:text-slate-500 text-xs mt-1 max-w-xs">
              Transactions will appear here after deposits, purchases, payouts,
              or withdrawal requests.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-dark-border">
            {txns.map((txn: any) => {
              const isCredit = [
                "payout",
                "deposit",
                "bonus",
                "escrow_release",
                "refund",
              ].includes(txn.type);
              return (
                <div
                  key={txn._id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isCredit
                        ? "bg-green-50 dark:bg-green-950/30"
                        : "bg-red-50 dark:bg-red-950/30",
                    )}
                  >
                    {isCredit ? (
                      <ArrowDownLeft size={16} className="text-brand-green" />
                    ) : (
                      <ArrowUpRight
                        size={16}
                        className="text-red-500 dark:text-red-400"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary dark:text-white capitalize">
                      {txn.type?.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500">
                      {txn.reference} · {formatRelativeTime(txn.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "font-bold text-sm",
                        isCredit
                          ? "text-brand-green"
                          : "text-red-500 dark:text-red-400",
                      )}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(txn.amount)}
                    </p>
                    {txn.fee > 0 && (
                      <p className="text-[11px] text-text-tertiary dark:text-slate-500">
                        fee: {formatCurrency(txn.fee)}
                      </p>
                    )}
                  </div>
                  <div>
                    {txn.status === "completed" ? (
                      <CheckCircle size={14} className="text-brand-green" />
                    ) : txn.status === "failed" ? (
                      <XCircle size={14} className="text-red-500" />
                    ) : (
                      <Clock size={14} className="text-brand-amber" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="bg-surface-0 dark:bg-dark-card rounded-2xl w-full max-w-md p-6 animate-slide-up border border-surface-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl text-brand-navy dark:text-white">
                {modal === "deposit" ? "Add Funds" : "Withdraw Funds"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
            {modal === "deposit" ? (
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="label">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "ecocash", l: "EcoCash", I: Smartphone },
                      { v: "paynow", l: "Paynow", I: CreditCard },
                      { v: "bank", l: "Bank", I: Wallet },
                    ].map(({ v, l, I }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMethod(v as any)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                          method === v
                            ? "border-brand-orange bg-orange-50 dark:bg-orange-950/20 text-brand-orange"
                            : "border-surface-200 dark:border-dark-border text-text-secondary dark:text-slate-300 hover:border-surface-300",
                        )}
                      >
                        <I size={18} />
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {method === "ecocash" && (
                  <div>
                    <label className="label">EcoCash Number</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="+263 7X XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="label">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary font-semibold text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      className="input pl-8"
                      placeholder="0.00"
                      min="1"
                      max="10000"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                    Min $1 · Max $10,000 per deposit
                  </p>
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={deposit.isPending}
                >
                  {deposit.isPending ? (
                    <>
                      <Spinner size={14} className="text-white" />
                      Processing…
                    </>
                  ) : (
                    `Deposit $${amount || "0.00"}`
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="p-4 bg-surface-50 dark:bg-dark-hover rounded-xl">
                  <p className="text-xs text-text-tertiary dark:text-slate-500">
                    Available to withdraw
                  </p>
                  <p className="font-display font-bold text-2xl text-brand-green mt-0.5">
                    {formatCurrency(w?.withdrawableBalance ?? 0)}
                  </p>
                </div>
                <div>
                  <label className="label">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary font-semibold text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      className="input pl-8"
                      placeholder="0.00"
                      min="1"
                      max={w?.withdrawableBalance ?? 0}
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                    2% fee · Net: {formatCurrency(Number(amount) * 0.98 || 0)}
                  </p>
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size={14} className="text-white" />
                      Submitting…
                    </>
                  ) : (
                    "Request Withdrawal"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
