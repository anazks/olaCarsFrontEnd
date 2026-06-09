import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  Coins,
  Loader2,
  ShieldAlert,
  Calculator,
  Wrench,
  Activity,
  User,
  ArrowUpRight,
  TrendingDown,
  Building,
  Truck,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getPartById,
  getPartTransactions,
  type InventoryPart,
  type PartTransaction,
} from "../../../services/inventoryService";
import { getLedgerEntries, type LedgerEntry } from "../../../services/ledgerService";
import Breadcrumbs from "../../../components/dashboard/shared/Breadcrumbs";

const InventoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Route prefix helper
  const isExecutiveAdmin = location.pathname.startsWith("/admin/admin");
  const backPath = isExecutiveAdmin ? "/admin/admin/inventory" : "/admin/financial-admin/inventory";

  // States
  const [part, setPart] = useState<InventoryPart | null>(null);
  const [loadingPart, setLoadingPart] = useState(true);

  const [transactions, setTransactions] = useState<PartTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Accounting Ledger States
  const [debitLedger, setDebitLedger] = useState<LedgerEntry[]>([]);
  const [creditLedger, setCreditLedger] = useState<LedgerEntry[]>([]);
  const [loadingDebit, setLoadingDebit] = useState(false);
  const [loadingCredit, setLoadingCredit] = useState(false);

  // Tab State: 'specs' | 'timeline' | 'debit' | 'credit'
  const [activeTab, setActiveTab] = useState<"specs" | "timeline" | "debit" | "credit">("specs");

  // Load Part Specs
  const loadPartDetails = useCallback(async () => {
    if (!id) return;
    setLoadingPart(true);
    try {
      const data = await getPartById(id);
      setPart(data);
    } catch (err: any) {
      console.error("Failed to load part details:", err);
      toast.error(err.response?.data?.message || "Failed to load inventory item specifications.");
      navigate(backPath);
    } finally {
      setLoadingPart(false);
    }
  }, [id, navigate, backPath]);

  // Load Stock Timeline
  const loadPartTimeline = useCallback(async () => {
    if (!id) return;
    setLoadingTx(true);
    try {
      const data = await getPartTransactions(id);
      setTransactions(data);
    } catch (err) {
      console.error("Failed to load part timeline:", err);
    } finally {
      setLoadingTx(false);
    }
  }, [id]);

  // Load Ledger Entries for Debit Account
  const loadDebitAccountLedger = useCallback(async (codeId: string) => {
    setLoadingDebit(true);
    try {
      const res = await getLedgerEntries({ accountingCode: codeId, limit: 100 });
      setDebitLedger(res.data || []);
    } catch (err) {
      console.error("Failed to load debit ledger:", err);
    } finally {
      setLoadingDebit(false);
    }
  }, []);

  // Load Ledger Entries for Credit Account
  const loadCreditAccountLedger = useCallback(async (codeId: string) => {
    setLoadingCredit(true);
    try {
      const res = await getLedgerEntries({ accountingCode: codeId, limit: 100 });
      setCreditLedger(res.data || []);
    } catch (err) {
      console.error("Failed to load credit ledger:", err);
    } finally {
      setLoadingCredit(false);
    }
  }, []);

  // Master load trigger
  useEffect(() => {
    loadPartDetails();
  }, [loadPartDetails]);

  // Trigger sub-data loading when tabs are clicked
  useEffect(() => {
    if (!part) return;
    if (activeTab === "timeline") {
      loadPartTimeline();
    } else if (activeTab === "debit") {
      const purchaseAccId = typeof part.purchaseAccountId === "object" ? part.purchaseAccountId?._id : part.purchaseAccountId;
      if (purchaseAccId) {
        loadDebitAccountLedger(purchaseAccId);
      }
    } else if (activeTab === "credit") {
      const incomeAccId = typeof part.incomeAccountId === "object" ? part.incomeAccountId?._id : part.incomeAccountId;
      if (incomeAccId) {
        loadCreditAccountLedger(incomeAccId);
      }
    }
  }, [activeTab, part, loadPartTimeline, loadDebitAccountLedger, loadCreditAccountLedger]);

  if (loadingPart) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 size={36} className="animate-spin text-[#D4F12E]" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
        <ShieldAlert size={48} className="text-red-500 mb-2 animate-bounce" />
        <h2 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Item Not Found</h2>
        <button onClick={() => navigate(backPath)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10">
          <ArrowLeft size={16} /> Return to Inventory
        </button>
      </div>
    );
  }

  const isLow = part.quantityOnHand <= part.reorderLevel;
  const assetValuation = part.quantityOnHand * part.unitCost;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 animate-fadeInUp">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: t("sidebar.sections.workshopManagement", "Workshop Management"), path: "#" }, { label: "Inventory", path: backPath }, { label: part.partNumber }]} />

      {/* Header back bar */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border bg-transparent hover:bg-white/5 transition-all cursor-pointer"
          style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
        >
          <ArrowLeft size={14} strokeWidth={3} />
          Back to List
        </button>
        <div className="flex items-center gap-2">
          {isLow && (
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center gap-1.5">
              <AlertCircle size={10} />
              Reorder Warning
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#D4F12E]/10 text-[#D4F12E] border border-[#D4F12E]/20">
            {part.isActive ? "ACTIVE SPEC" : "DEACTIVATED"}
          </span>
        </div>
      </div>

      {/* Main Grid: Info card left, stats right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Specifications & Overview */}
        <div className="lg:col-span-2 rounded-3xl p-6 border shadow-sm space-y-6" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
          <div className="flex items-center gap-3">
            <Wrench size={26} className="text-[#D4F12E]" />
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-main)" }}>
                {part.partName}
              </h2>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-dim" style={{ color: "var(--text-muted)" }}>
                SKU / Part Number: {part.partNumber}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-dashed" style={{ borderColor: "var(--border-main)" }}>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs">
                <Building size={16} className="opacity-50" style={{ color: "var(--text-muted)" }} />
                <div>
                  <span className="text-[10px] text-dim block uppercase font-bold tracking-wide">Workshop Branch Location</span>
                  <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                    {typeof part.branchId === "object" ? part.branchId.name : part.branchId}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Truck size={16} className="opacity-50" style={{ color: "var(--text-muted)" }} />
                <div>
                  <span className="text-[10px] text-dim block uppercase font-bold tracking-wide">Primary Supplier</span>
                  <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                    {typeof part.supplierId === "object" ? part.supplierId?.name : "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Calendar size={16} className="opacity-50" style={{ color: "var(--text-muted)" }} />
                <div>
                  <span className="text-[10px] text-dim block uppercase font-bold tracking-wide">Last Restocked Timestamp</span>
                  <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                    {part.lastRestockedAt ? new Date(part.lastRestockedAt).toLocaleString() : "No restsocks registered"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-dim block uppercase font-bold tracking-wide mb-0.5">Part Classification Category</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white/5 border border-white/10" style={{ color: "var(--text-main)" }}>
                  {part.category}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-dim block uppercase font-bold tracking-wide mb-0.5">Part Packaging Unit</span>
                <span className="font-semibold uppercase text-xs" style={{ color: "var(--text-main)" }}>
                  {part.unit || "piece"}(s)
                </span>
              </div>

              <div>
                <span className="text-[10px] text-dim block uppercase font-bold tracking-wide mb-0.5">Supplier SKU / Lead Time</span>
                <span className="text-xs" style={{ color: "var(--text-main)" }}>
                  {part.supplierPartNumber || "N/A"} ({part.leadTimeDays || 7} Days)
                </span>
              </div>
            </div>
          </div>

          {part.description && (
            <div className="p-4 rounded-2xl border text-xs leading-relaxed" style={{ background: "var(--bg-input)", borderColor: "var(--border-main)" }}>
              <span className="text-[10px] font-black text-dim uppercase tracking-wider block mb-1">Specifications Description</span>
              <p style={{ color: "var(--text-main)" }}>{part.description}</p>
            </div>
          )}
        </div>

        {/* Stock & Cost Valuation Card */}
        <div className="rounded-3xl p-6 border shadow-sm flex flex-col justify-between" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-dim mb-4" style={{ color: "var(--text-muted)" }}>
              Physical Stock Valuation
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-black/10 border mb-6" style={{ borderColor: "var(--border-main)" }}>
              <div>
                <div className="text-[9px] uppercase tracking-wider opacity-60 text-dim">On Hand</div>
                <div className="text-xl font-black font-mono mt-0.5" style={{ color: "var(--text-main)" }}>
                  {part.quantityOnHand}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider opacity-60 text-dim text-yellow-500">Reserved</div>
                <div className="text-xl font-black font-mono mt-0.5 text-yellow-500">
                  {part.quantityReserved}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider opacity-60 text-dim text-green-500">Available</div>
                <div className="text-xl font-black font-mono mt-0.5 text-green-500">
                  {part.quantityOnHand - part.quantityReserved}
                </div>
              </div>
            </div>

            <div className="space-y-3 font-semibold text-xs border-t border-dashed pt-4" style={{ borderColor: "var(--border-main)" }}>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-muted)" }}>Unit Cost:</span>
                <span className="font-mono text-sm" style={{ color: "var(--text-main)" }}>
                  ${part.unitCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-muted)" }}>Safety Limit Threshold:</span>
                <span className="font-mono text-sm" style={{ color: "var(--text-main)" }}>
                  {part.reorderLevel} units
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-500/5 rounded-xl border border-red-500/10">
                <span className="text-red-500 font-bold uppercase text-[9px] tracking-wider">Asset Capital Valuation:</span>
                <span className="font-mono text-sm font-black text-red-500">
                  ${assetValuation.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting Accounts Display Panel */}
      <div className="rounded-3xl p-6 border shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
        <h3 className="text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--text-main)" }}>
          <Calculator size={16} className="text-[#D4F12E]" />
          Linked Accounting Accounts Mapping
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
          <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-input)" }}>
            <span className="text-[9px] uppercase tracking-wider text-red-400 block mb-1">Debit / Asset / Purchase Account</span>
            <span className="font-mono font-bold text-sm block" style={{ color: "var(--text-main)" }}>
              {typeof part.purchaseAccountId === "object" && part.purchaseAccountId
                ? `${part.purchaseAccountId.code} - ${part.purchaseAccountId.name}`
                : "CGS0001 (Cost of Goods Sold - Default)"}
            </span>
          </div>

          <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-input)" }}>
            <span className="text-[9px] uppercase tracking-wider text-green-400 block mb-1">Credit / Sales / Income Account</span>
            <span className="font-mono font-bold text-sm block" style={{ color: "var(--text-main)" }}>
              {typeof part.incomeAccountId === "object" && part.incomeAccountId
                ? `${part.incomeAccountId.code} - ${part.incomeAccountId.name}`
                : "IN0008 (Parts Income - Default)"}
            </span>
          </div>

          <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-input)" }}>
            <span className="text-[9px] uppercase tracking-wider text-[#D4F12E] block mb-1">Applied Sales Tax rate</span>
            <span className="font-mono font-bold text-sm block" style={{ color: "var(--text-main)" }}>
              {typeof part.taxId === "object" && part.taxId
                ? `${part.taxId.name} (${part.taxId.rate}%)`
                : "ITBMS (7% - Default)"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="rounded-3xl p-6 border shadow-sm space-y-6" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
        {/* Navigation Tabs */}
        <div className="flex gap-6 border-b pb-3" style={{ borderColor: "var(--border-main)" }}>
          <button
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-[14px] bg-transparent border-none outline-none cursor-pointer ${
              activeTab === "specs"
                ? "border-[#D4F12E] text-[var(--text-main)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            onClick={() => setActiveTab("specs")}
          >
            Specification Metrics
          </button>
          <button
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-[14px] bg-transparent border-none outline-none cursor-pointer ${
              activeTab === "timeline"
                ? "border-[#D4F12E] text-[var(--text-main)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            onClick={() => setActiveTab("timeline")}
          >
            Stock Movements ({transactions.length > 0 ? transactions.length : ""})
          </button>
          <button
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-[14px] bg-transparent border-none outline-none cursor-pointer ${
              activeTab === "debit"
                ? "border-[#D4F12E] text-[var(--text-main)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            onClick={() => setActiveTab("debit")}
          >
            Debit Ledger History
          </button>
          <button
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-[14px] bg-transparent border-none outline-none cursor-pointer ${
              activeTab === "credit"
                ? "border-[#D4F12E] text-[var(--text-main)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            onClick={() => setActiveTab("credit")}
          >
            Credit Ledger History
          </button>
        </div>

        {/* Tab panels */}
        <div className="pt-2">
          {activeTab === "specs" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-input)" }}>
                <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--text-main)" }}>Part Valuation & Reorder Parameters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span style={{ color: "var(--text-muted)" }}>Required Safety Buffer stock:</span>
                    <span className="font-mono text-white">{part.reorderLevel} {part.unit || "pc"}(s)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span style={{ color: "var(--text-muted)" }}>Unit purchase cost:</span>
                    <span className="font-mono text-white">${part.unitCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span style={{ color: "var(--text-muted)" }}>Current available stock (OnHand - Reserved):</span>
                    <span className={`font-mono ${isLow ? "text-yellow-500" : "text-green-400"}`}>{part.quantityOnHand - part.quantityReserved} {part.unit || "pc"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span style={{ color: "var(--text-muted)" }}>Total asset capitalized cost:</span>
                    <span className="font-mono text-green-500">${(part.quantityOnHand * part.unitCost).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-4">
              {loadingTx ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-[#D4F12E]" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-xs font-bold opacity-30 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  No stock timeline movements logged.
                </div>
              ) : (
                <div className="overflow-x-auto w-full rounded-2xl border" style={{ borderColor: "var(--border-main)" }}>
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead style={{ backgroundColor: "var(--bg-input)" }}>
                      <tr className="text-[10px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}>
                        <th className="py-3 px-4">Event Date</th>
                        <th className="py-3 px-4">Movement Type</th>
                        <th className="py-3 px-4 text-center">Quantity</th>
                        <th className="py-3 px-4">Performed By</th>
                        <th className="py-3 px-4">Reference Notes</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-semibold divide-y" style={{ borderColor: "var(--border-main)" }}>
                      {transactions.map((tx) => (
                        <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono opacity-80" style={{ color: "var(--text-muted)" }}>
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                tx.transactionType === "RESTOCK" || tx.transactionType === "RETURN"
                                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                  : tx.transactionType === "INSTALL"
                                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              }`}
                            >
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold" style={{ color: "var(--text-main)" }}>
                            {tx.transactionType === "RESTOCK" || tx.transactionType === "RELEASE" || tx.transactionType === "RETURN" ? "+" : "-"}
                            {tx.quantity} {part.unit || "pc"}
                          </td>
                          <td className="py-3.5 px-4" style={{ color: "var(--text-main)" }}>
                            <div className="font-bold">{typeof tx.performedBy === "object" ? tx.performedBy.name : tx.performedBy}</div>
                            <div className="text-[9px] uppercase tracking-wider text-dim" style={{ color: "var(--text-muted)" }}>{tx.role}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs max-w-sm truncate" style={{ color: "var(--text-muted)" }} title={tx.notes}>
                            {tx.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "debit" && (
            <div className="space-y-4">
              {loadingDebit ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-[#D4F12E]" />
                </div>
              ) : debitLedger.length === 0 ? (
                <div className="text-center py-12 text-xs font-bold opacity-30 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  No Debit Ledger transactions hitting this account.
                </div>
              ) : (
                <div className="overflow-x-auto w-full rounded-2xl border" style={{ borderColor: "var(--border-main)" }}>
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead style={{ backgroundColor: "var(--bg-input)" }}>
                      <tr className="text-[10px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Debit</th>
                        <th className="py-3 px-4 text-right">Credit</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-semibold divide-y" style={{ borderColor: "var(--border-main)" }}>
                      {debitLedger.map((entry) => (
                        <tr key={entry._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono opacity-80" style={{ color: "var(--text-muted)" }}>
                            {entry.date ? new Date(entry.date).toLocaleDateString() : new Date(entry.createdAt || "").toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold max-w-sm truncate" style={{ color: "var(--text-main)" }} title={entry.description}>
                            {entry.description}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-green-500">
                            {entry.debit ? `$${entry.debit.toFixed(2)}` : entry.type === "DEBIT" && entry.amount ? `$${entry.amount.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500">
                            {entry.credit ? `$${entry.credit.toFixed(2)}` : entry.type === "CREDIT" && entry.amount ? `$${entry.amount.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${entry.type === "DEBIT" || entry.debit ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                              {entry.type || (entry.debit ? "DEBIT" : "CREDIT")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {entry.referenceId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "credit" && (
            <div className="space-y-4">
              {loadingCredit ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-[#D4F12E]" />
                </div>
              ) : creditLedger.length === 0 ? (
                <div className="text-center py-12 text-xs font-bold opacity-30 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  No Credit Ledger transactions hitting this account.
                </div>
              ) : (
                <div className="overflow-x-auto w-full rounded-2xl border" style={{ borderColor: "var(--border-main)" }}>
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead style={{ backgroundColor: "var(--bg-input)" }}>
                      <tr className="text-[10px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Debit</th>
                        <th className="py-3 px-4 text-right">Credit</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-semibold divide-y" style={{ borderColor: "var(--border-main)" }}>
                      {creditLedger.map((entry) => (
                        <tr key={entry._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono opacity-80" style={{ color: "var(--text-muted)" }}>
                            {entry.date ? new Date(entry.date).toLocaleDateString() : new Date(entry.createdAt || "").toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold max-w-sm truncate" style={{ color: "var(--text-main)" }} title={entry.description}>
                            {entry.description}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-green-500">
                            {entry.debit ? `$${entry.debit.toFixed(2)}` : entry.type === "DEBIT" && entry.amount ? `$${entry.amount.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500">
                            {entry.credit ? `$${entry.credit.toFixed(2)}` : entry.type === "CREDIT" && entry.amount ? `$${entry.amount.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${entry.type === "DEBIT" || entry.debit ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                              {entry.type || (entry.debit ? "DEBIT" : "CREDIT")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {entry.referenceId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryDetail;
