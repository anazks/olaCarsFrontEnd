/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Filter,
  AlertCircle,
  ChevronDown,
  Eye,
  Coins,
  Check,
  Loader2,
  ShieldAlert,
  X,
  Plus,
  Edit2,
  Trash2,
  Activity,
  ArrowUpRight,
  TrendingDown,
  Calculator,
  Wrench,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getParts,
  createPart,
  updatePart,
  deletePart,
  restockPart,
  type InventoryPart,
} from "../../../services/inventoryService";
import { getAllBranches, type Branch } from "../../../services/branchService";
import { getAllAccountingCodes, type AccountingCode } from "../../../services/accountingService";
import { getAllTaxes, type Tax } from "../../../services/taxService";
import { getAllSuppliers, type Supplier } from "../../../services/supplierService";
import { getUserRole } from "../../../utils/auth";
import Breadcrumbs from "../../../components/dashboard/shared/Breadcrumbs";

const CATEGORIES = [
  "Engine",
  "Transmission",
  "Brakes",
  "Suspension",
  "Electrical",
  "Body",
  "Tyres",
  "Fluids",
  "Filters",
  "Belts",
  "Cooling",
  "Exhaust",
  "Interior",
  "Other",
];

const UNITS = ["piece", "litre", "kg", "metre", "set", "pair", "box"];

const InventoryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = getUserRole() || "";
  const canManageInventory = ["admin", "financialadmin", "financeadmin", "workshopmanager", "branchmanager"].includes(userRole);

  // Router path prefix
  const isExecutiveAdmin = location.pathname.startsWith("/admin/admin");
  const basePrefix = isExecutiveAdmin ? "/admin/admin" : "/admin/financial-admin";

  // Lists & States
  const [parts, setParts] = useState<InventoryPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Restock Modal
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockQty, setRestockQty] = useState<number>(5);
  const [restockingPartId, setRestockingPartId] = useState<string | null>(null);
  const [processingRestock, setProcessingRestock] = useState(false);

  // Create & Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [submittingPart, setSubmittingPart] = useState(false);
  const [partForm, setPartForm] = useState({
    partName: "",
    partNumber: "",
    category: "Engine",
    description: "",
    unit: "piece",
    unitCost: 0,
    quantityOnHand: 0,
    reorderLevel: 5,
    branchId: "",
    supplierId: "",
    supplierPartNumber: "",
    leadTimeDays: 7,
    purchaseAccountId: "",
    incomeAccountId: "",
    taxId: "",
  });

  // Deletion Modal
  const [deletingPartId, setDeletingPartId] = useState<string | null>(null);
  const [deletingPartName, setDeletingPartName] = useState("");
  const [processingDelete, setProcessingDelete] = useState(false);

  // Load support resources once on mount
  useEffect(() => {
    const loadSupportData = async () => {
      try {
        const [branchRes, supplierRes, acctRes, taxRes] = await Promise.all([
          getAllBranches({ limit: 100 }),
          getAllSuppliers({ limit: 100 }),
          getAllAccountingCodes({ limit: 1000 }),
          getAllTaxes({ limit: 100 }),
        ]);

        setBranches(branchRes.data || []);
        setSuppliers(supplierRes.data || []);
        
        // Extract accounting code array
        const rawAccts = acctRes.data || acctRes;
        setAccountingCodes(Array.isArray(rawAccts) ? rawAccts : []);
        
        // Extract tax array
        const rawTaxes = taxRes.data || taxRes;
        setTaxes(Array.isArray(rawTaxes) ? rawTaxes : []);
      } catch (err) {
        console.error("Error loading supporting data:", err);
      }
    };
    loadSupportData();
  }, []);

  // Fetch Parts Handler
  const fetchPartsList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryFilter) params.category = categoryFilter;
      if (branchFilter) params.branchId = branchFilter;
      if (lowStockFilter) params.lowStock = "true";

      const data = await getParts(params);
      setParts(data);
    } catch (err: any) {
      console.error("Failed to load parts:", err);
      toast.error(err.response?.data?.message || "Failed to load inventory parts.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, branchFilter, lowStockFilter]);

  // Trigger search on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPartsList();
    }, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchPartsList, searchTerm, categoryFilter, branchFilter, lowStockFilter]);

  // Reset page number on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, branchFilter, lowStockFilter]);

  // View Details page routing
  const handleViewPart = (part: InventoryPart) => {
    navigate(`${basePrefix}/inventory/${part._id}`);
  };

  // Restock action
  const handleOpenRestock = (part: InventoryPart) => {
    setRestockingPartId(part._id);
    setRestockQty(5);
    setShowRestockModal(true);
  };

  const handleConfirmRestock = async () => {
    if (!restockingPartId || restockQty <= 0) return;
    setProcessingRestock(true);
    try {
      await restockPart(restockingPartId, restockQty);
      toast.success("Stock received successfully!");
      setShowRestockModal(false);
      fetchPartsList();
    } catch (err: any) {
      console.error("Failed to restock:", err);
      toast.error(err.response?.data?.message || "Restock adjustment failed.");
    } finally {
      setProcessingRestock(false);
    }
  };

  // Delete Action Handler
  const triggerDeletePart = (part: InventoryPart) => {
    setDeletingPartId(part._id);
    setDeletingPartName(part.partName);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPartId) return;
    setProcessingDelete(true);
    try {
      await deletePart(deletingPartId);
      toast.success("Inventory part deactivated successfully.");
      setDeletingPartId(null);
      fetchPartsList();
    } catch (err: any) {
      console.error("Failed to delete part:", err);
      toast.error(err.response?.data?.message || "Failed to deactivate part.");
    } finally {
      setProcessingDelete(false);
    }
  };

  // Edit Action Handler
  const handleOpenEdit = (part: InventoryPart) => {
    setIsEditMode(true);
    setEditingPartId(part._id);
    setPartForm({
      partName: part.partName,
      partNumber: part.partNumber,
      category: part.category || "Engine",
      description: part.description || "",
      unit: part.unit || "piece",
      unitCost: part.unitCost,
      quantityOnHand: part.quantityOnHand,
      reorderLevel: part.reorderLevel,
      branchId: typeof part.branchId === "object" ? part.branchId._id : part.branchId || "",
      supplierId: typeof part.supplierId === "object" ? part.supplierId?._id || "" : part.supplierId || "",
      supplierPartNumber: part.supplierPartNumber || "",
      leadTimeDays: part.leadTimeDays || 7,
      purchaseAccountId: typeof part.purchaseAccountId === "object" ? part.purchaseAccountId?._id || "" : part.purchaseAccountId || "",
      incomeAccountId: typeof part.incomeAccountId === "object" ? part.incomeAccountId?._id || "" : part.incomeAccountId || "",
      taxId: typeof part.taxId === "object" ? part.taxId?._id || "" : part.taxId || "",
    });
    setShowCreateModal(true);
  };

  // Create Mode opener
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingPartId(null);
    setPartForm({
      partName: "",
      partNumber: "",
      category: "Engine",
      description: "",
      unit: "piece",
      unitCost: 0,
      quantityOnHand: 0,
      reorderLevel: 5,
      branchId: branches[0]?._id || "",
      supplierId: "",
      supplierPartNumber: "",
      leadTimeDays: 7,
      purchaseAccountId: "",
      incomeAccountId: "",
      taxId: "",
    });
    setShowCreateModal(true);
  };

  // Form Submit Handler
  const handlePartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm.partName || !partForm.partNumber || !partForm.category || !partForm.branchId) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmittingPart(true);
    try {
      const payload: any = {
        partName: partForm.partName.trim(),
        partNumber: partForm.partNumber.trim().toUpperCase(),
        category: partForm.category,
        description: partForm.description.trim() || undefined,
        unit: partForm.unit,
        unitCost: Number(partForm.unitCost),
        quantityOnHand: Number(partForm.quantityOnHand),
        reorderLevel: Number(partForm.reorderLevel),
        branchId: partForm.branchId,
        leadTimeDays: Number(partForm.leadTimeDays),
      };

      if (partForm.supplierId) payload.supplierId = partForm.supplierId;
      if (partForm.supplierPartNumber) payload.supplierPartNumber = partForm.supplierPartNumber.trim();
      if (partForm.purchaseAccountId) payload.purchaseAccountId = partForm.purchaseAccountId;
      if (partForm.incomeAccountId) payload.incomeAccountId = partForm.incomeAccountId;
      if (partForm.taxId) payload.taxId = partForm.taxId;

      if (isEditMode && editingPartId) {
        delete payload.quantityOnHand;
        await updatePart(editingPartId, payload);
        toast.success("Inventory part updated successfully!");
      } else {
        await createPart(payload);
        toast.success("Inventory part created successfully!");
      }
      setShowCreateModal(false);
      fetchPartsList();
    } catch (err: any) {
      console.error("Part save failed:", err);
      toast.error(err.response?.data?.message || "Failed to save inventory part.");
    } finally {
      setSubmittingPart(false);
    }
  };

  // Pagination Math
  const totalRecords = parts.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedParts = parts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  // Metrics Stats
  const totalValuation = parts.reduce((sum, part) => sum + part.quantityOnHand * part.unitCost, 0);
  const lowStockCount = parts.filter((part) => part.quantityOnHand <= part.reorderLevel).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 animate-fadeInUp">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: t("sidebar.sections.workshopManagement", "Workshop Management"), path: "#" }, { label: "Inventory" }]} />

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 pb-6 border-b border-dashed" style={{ borderColor: "var(--border-main)" }}>
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: "var(--text-main)" }}>
            <Wrench size={32} className="text-[#D4F12E]" />
            Inventory & Parts Hub
          </h1>
          <p className="text-sm font-medium mt-1 animate-pulse" style={{ color: "var(--text-muted)" }}>
            Manage warehouse parts inventory, reorder quantities, and track ledger accounts.
          </p>
        </div>
        {canManageInventory && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-wider bg-[#D4F12E] hover:bg-[#b5cf22] text-black shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} />
            Register Part
          </button>
        )}
      </div>

      {/* Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:-translate-y-1 duration-300 transition-all" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-500">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-6">
            <div className="text-3xl font-black leading-none tracking-tight" style={{ color: "var(--text-main)" }}>
              {parts.length}
            </div>
            <p className="text-[11px] font-black tracking-wider uppercase mt-2" style={{ color: "var(--text-muted)" }}>
              Total Inventoried Items
            </p>
            <p className="text-[10px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>
              Distinct parts registered in local databases
            </p>
          </div>
        </div>

        <div
          className={`rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:-translate-y-1 duration-300 transition-all ${lowStockCount > 0 ? "border-yellow-500/20 bg-yellow-500/[0.02]" : ""}`}
          style={{ background: "var(--bg-card)", borderColor: lowStockCount > 0 ? undefined : "var(--border-main)" }}
        >
          <div className="flex justify-between items-start">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${lowStockCount > 0 ? "bg-yellow-500/20 text-yellow-500" : "bg-gray-500/10 text-gray-500"}`}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-6">
            <div className={`text-3xl font-black leading-none tracking-tight ${lowStockCount > 0 ? "text-yellow-500" : ""}`} style={{ color: lowStockCount > 0 ? undefined : "var(--text-main)" }}>
              {lowStockCount} items
            </div>
            <p className="text-[11px] font-black tracking-wider uppercase mt-2" style={{ color: "var(--text-muted)" }}>
              Low Stock Alerts
            </p>
            <p className="text-[10px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>
              Quantities below safety reorder threshold
            </p>
          </div>
        </div>

        <div className="rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:-translate-y-1 duration-300 transition-all" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-green-500/10 text-green-500">
              <Coins size={20} />
            </div>
          </div>
          <div className="mt-6">
            <div className="text-3xl font-black leading-none tracking-tight text-green-500">
              ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-black tracking-wider uppercase mt-2" style={{ color: "var(--text-muted)" }}>
              Total Asset Valuation
            </p>
            <p className="text-[10px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>
              Estimated cost value of current on-hand items
            </p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-3xl p-6 border shadow-sm space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
        <div className="flex gap-3 flex-wrap md:flex-nowrap">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by Part Name or Part Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-2xl border bg-transparent text-sm outline-none font-medium transition-colors focus:border-[#D4F12E]"
              style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-sm bg-transparent hover:bg-white/5 transition-all cursor-pointer`}
            style={{ borderColor: showFilters ? "#D4F12E" : "var(--border-main)", color: "var(--text-main)" }}
          >
            <Filter size={16} />
            Filters
            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-dashed" style={{ borderColor: "var(--border-main)" }}>
            <div className="relative">
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-transparent text-xs outline-none cursor-pointer appearance-none"
                style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
              >
                <option value="" style={{ background: "var(--bg-card)" }}>All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: "var(--bg-card)" }}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-7 opacity-50 pointer-events-none" style={{ color: "var(--text-main)" }} />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Workshop/Branch
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-transparent text-xs outline-none cursor-pointer appearance-none"
                style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
              >
                <option value="" style={{ background: "var(--bg-card)" }}>All Workshops</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id} style={{ background: "var(--bg-card)" }}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-7 opacity-50 pointer-events-none" style={{ color: "var(--text-main)" }} />
            </div>

            <div className="flex items-center h-full pt-4">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none" style={{ color: "var(--text-main)" }}>
                <input
                  type="checkbox"
                  checked={lowStockFilter}
                  onChange={(e) => setLowStockFilter(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#D4F12E] focus:ring-[#D4F12E]"
                />
                Show Low Stock Alerts Only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Main List Table Card */}
      <div className="rounded-3xl border overflow-hidden shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={36} className="animate-spin text-[#D4F12E]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead style={{ backgroundColor: "var(--bg-input)" }}>
                  <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}>
                    <th className="py-4 px-6">Part Number</th>
                    <th className="py-4 px-4">Part Name</th>
                    <th className="py-4 px-4">Category</th>
                    <th className="py-4 px-4 text-center">Stock Level</th>
                    <th className="py-4 px-4">Cost</th>
                    <th className="py-4 px-4 text-right">Asset Value</th>
                    <th className="py-4 px-4">Workshop</th>
                    <th className="py-4 px-4">Accounts & Tax</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y" style={{ borderColor: "var(--border-main)" }}>
                  {paginatedParts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-20 text-sm font-bold opacity-50 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                        <ShieldAlert size={40} className="mx-auto mb-2 opacity-20 text-[#D4F12E]" />
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    paginatedParts.map((part) => {
                      const isLow = part.quantityOnHand <= part.reorderLevel;
                      const purchaseCode = typeof part.purchaseAccountId === "object" ? part.purchaseAccountId?.code : "";
                      const incomeCode = typeof part.incomeAccountId === "object" ? part.incomeAccountId?.code : "";
                      const taxName = typeof part.taxId === "object" ? part.taxId?.name : "";
                      const taxRate = typeof part.taxId === "object" ? part.taxId?.rate : 0;
                      
                      return (
                        <tr key={part._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                          <td className="py-4 px-6 font-mono text-xs font-black uppercase" style={{ color: "var(--text-main)" }}>
                            {part.partNumber}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold flex items-center gap-1.5" style={{ color: "var(--text-main)" }}>
                              {part.partName}
                              {isLow && (
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" title="Low stock limit reached" />
                              )}
                            </div>
                            {part.description && (
                              <div className="text-[10px] truncate max-w-[200px]" style={{ color: "var(--text-muted)" }} title={part.description}>
                                {part.description}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border" style={{ borderColor: "var(--border-main)", color: "var(--text-muted)" }}>
                              {part.category}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col items-center">
                              <span className={`font-bold font-mono text-sm ${isLow ? "text-yellow-500" : "text-green-500"}`}>
                                {part.quantityOnHand} / {part.reorderLevel}
                              </span>
                              <span className="text-[9px] uppercase tracking-wide opacity-50" style={{ color: "var(--text-muted)" }}>
                                {part.quantityReserved} reserved · {part.quantityOnHand - part.quantityReserved} available
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono font-medium text-xs" style={{ color: "var(--text-muted)" }}>
                            ${part.unitCost.toFixed(2)} / {part.unit || "pc"}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-black" style={{ color: isLow ? "var(--text-muted)" : "var(--text-main)" }}>
                            ${(part.quantityOnHand * part.unitCost).toFixed(2)}
                          </td>
                          <td className="py-4 px-4 font-semibold text-xs" style={{ color: "var(--text-main)" }}>
                            {typeof part.branchId === "object" ? part.branchId.name : part.branchId}
                          </td>
                          <td className="py-4 px-4 text-xs font-mono">
                            <div className="flex flex-col gap-0.5">
                              {purchaseCode && (
                                <span className="text-[10px] text-red-400" title="Purchase Expense/Inventory Account">
                                  Debit: {purchaseCode}
                                </span>
                              )}
                              {incomeCode && (
                                <span className="text-[10px] text-green-400" title="Sales Income Account">
                                  Credit: {incomeCode}
                                </span>
                              )}
                              {taxName && (
                                <span className="text-[9px] font-black opacity-50" style={{ color: "var(--text-muted)" }}>
                                  Tax: {taxName} ({taxRate}%)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewPart(part)}
                                className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-white/5 transition-all cursor-pointer bg-transparent"
                                style={{ borderColor: "var(--border-main)", color: "var(--text-muted)" }}
                                title="View Part Specification Detail & Ledger"
                              >
                                <Eye size={14} className="hover:text-[var(--text-main)]" />
                              </button>
                              {canManageInventory && (
                                <>
                                  <button
                                    onClick={() => handleOpenRestock(part)}
                                    className="w-8 h-8 rounded-lg border border-green-500/20 bg-green-500/5 flex items-center justify-center hover:bg-green-500/10 text-green-500 transition-all cursor-pointer"
                                    title="Add Stock / Restock"
                                  >
                                    <Plus size={14} strokeWidth={3} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(part)}
                                    className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-white/5 transition-all cursor-pointer bg-transparent"
                                    style={{ borderColor: "var(--border-main)", color: "var(--text-muted)" }}
                                    title="Edit Part Specifications"
                                  >
                                    <Edit2 size={13} className="hover:text-[var(--text-main)]" />
                                  </button>
                                  <button
                                    onClick={() => triggerDeletePart(part)}
                                    className="w-8 h-8 rounded-lg border border-red-500/20 bg-red-500/5 flex items-center justify-center hover:bg-red-500/10 text-red-400 transition-all cursor-pointer"
                                    title="Deactivate Part"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.01)" }}>
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Showing <span className="text-lime font-black" style={{ color: "var(--brand-lime)" }}>{paginatedParts.length}</span> of <span className="text-white font-black">{totalRecords}</span> records
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    style={{ color: "var(--text-main)" }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-xl border border-white/5">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = currentPage;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all cursor-pointer`}
                          style={{
                            color: currentPage === pageNum ? "#000" : "var(--text-main)",
                            backgroundColor: currentPage === pageNum ? "var(--brand-lime)" : "transparent"
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    style={{ color: "var(--text-main)" }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CREATE & EDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="rounded-3xl border w-full max-w-2xl p-6 relative animate-scaleIn shadow-2xl overflow-y-auto max-h-[90vh]" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border transition-colors hover:bg-white/5 cursor-pointer bg-transparent"
              style={{ borderColor: "var(--border-main)", color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 pb-4 border-b border-dashed" style={{ borderColor: "var(--border-main)" }}>
              <Sparkles size={22} className="text-[#D4F12E]" />
              <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-main)" }}>
                {isEditMode ? "Modify Part Specification" : "Register New Inventory Item"}
              </h2>
            </div>

            <form onSubmit={handlePartSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Part Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Front Brake Pads Set"
                    value={partForm.partName}
                    onChange={(e) => setPartForm({ ...partForm, partName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-[#D4F12E]"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Part Number *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. BRK-PAD-F-001"
                    value={partForm.partNumber}
                    disabled={isEditMode}
                    onChange={(e) => setPartForm({ ...partForm, partNumber: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-[#D4F12E] disabled:opacity-50"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Category *
                  </label>
                  <select
                    required
                    value={partForm.category}
                    onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none cursor-pointer"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} style={{ background: "var(--bg-card)" }}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Unit Format *
                  </label>
                  <select
                    required
                    value={partForm.unit}
                    onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none cursor-pointer"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u} style={{ background: "var(--bg-card)" }}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Unit Purchase Cost ($) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 45.50"
                    value={partForm.unitCost}
                    onChange={(e) => setPartForm({ ...partForm, unitCost: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-[#D4F12E]"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Reorder Alert Level *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={partForm.reorderLevel}
                    onChange={(e) => setPartForm({ ...partForm, reorderLevel: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-[#D4F12E]"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  />
                </div>

                {!isEditMode && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                      Initial Quantity on Hand
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={partForm.quantityOnHand}
                      onChange={(e) => setPartForm({ ...partForm, quantityOnHand: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-[#D4F12E]"
                      style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Workshop / Location *
                  </label>
                  <select
                    required
                    value={partForm.branchId}
                    onChange={(e) => setPartForm({ ...partForm, branchId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none cursor-pointer"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  >
                    <option value="" disabled>Select Workshop Location</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id} style={{ background: "var(--bg-card)" }}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add brief details about the part usage, engine sizes, model compatibility..."
                    value={partForm.description}
                    onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none resize-none focus:border-[#D4F12E]"
                    style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  />
                </div>

                {/* Supplier detail grouping */}
                <div className="col-span-2 p-3.5 rounded-2xl border space-y-3" style={{ borderColor: "var(--border-main)" }}>
                  <span className="text-[9px] font-black uppercase tracking-widest text-dim block">Supplier Details (Optional)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                        Supplier vendor
                      </label>
                      <select
                        value={partForm.supplierId}
                        onChange={(e) => setPartForm({ ...partForm, supplierId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none cursor-pointer text-xs"
                        style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                      >
                        <option value="">— Choose Supplier —</option>
                        {suppliers.map((s) => (
                          <option key={s._id} value={s._id} style={{ background: "var(--bg-card)" }}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                        Supplier SKU/Part #
                      </label>
                      <input
                        type="text"
                        placeholder="SKU-839"
                        value={partForm.supplierPartNumber}
                        onChange={(e) => setPartForm({ ...partForm, supplierPartNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none text-xs focus:border-[#D4F12E]"
                        style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                        Lead Time (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="7"
                        value={partForm.leadTimeDays}
                        onChange={(e) => setPartForm({ ...partForm, leadTimeDays: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none text-xs focus:border-[#D4F12E]"
                        style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Accounting accounts configuration grouping */}
                <div className="col-span-2 p-3.5 rounded-2xl border space-y-3" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-input)" }}>
                  <span className="text-[9px] font-black uppercase tracking-widest text-dim block flex items-center gap-1">
                    <Calculator size={12} className="text-[#D4F12E]" />
                    Accounting Integration Mapping (Optional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                        Purchase/Asset Account
                      </label>
                      <select
                        value={partForm.purchaseAccountId}
                        onChange={(e) => setPartForm({ ...partForm, purchaseAccountId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none cursor-pointer text-xs"
                        style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                      >
                        <option value="">— Default: CGS0001 —</option>
                        {accountingCodes
                          .filter((c) => c.category === "EXPENSE" || c.category === "ASSET")
                          .map((c) => (
                            <option key={c._id} value={c._id} style={{ background: "var(--bg-card)" }}>
                              {c.code} - {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                        Sales/Income Account
                      </label>
                      <select
                        value={partForm.incomeAccountId}
                        onChange={(e) => setPartForm({ ...partForm, incomeAccountId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none cursor-pointer text-xs"
                        style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                      >
                        <option value="">— Default: IN0008 —</option>
                        {accountingCodes
                          .filter((c) => c.category === "INCOME")
                          .map((c) => (
                            <option key={c._id} value={c._id} style={{ background: "var(--bg-card)" }}>
                              {c.code} - {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                        Applied Sales Tax Rate
                      </label>
                      <select
                        value={partForm.taxId}
                        onChange={(e) => setPartForm({ ...partForm, taxId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none cursor-pointer text-xs"
                        style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                      >
                        <option value="">— Default: ITBMS (7%) —</option>
                        {taxes.map((t) => (
                          <option key={t._id} value={t._id} style={{ background: "var(--bg-card)" }}>
                            {t.name} ({t.rate}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dashed" style={{ borderColor: "var(--border-main)" }}>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl border font-bold text-sm bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  onClick={() => setShowCreateModal(false)}
                  disabled={submittingPart}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#D4F12E] hover:bg-[#b5cf22] text-black transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  disabled={submittingPart}
                >
                  {submittingPart ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Saving specification...
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      {isEditMode ? "Save Specification" : "Register Part"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK DIALOG */}
      {showRestockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="rounded-3xl border w-full max-w-sm p-6 relative animate-scaleIn shadow-2xl" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
            <button
              onClick={() => setShowRestockModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border transition-colors hover:bg-white/5 cursor-pointer bg-transparent"
              style={{ borderColor: "var(--border-main)", color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 pb-4 border-b border-dashed mb-4" style={{ borderColor: "var(--border-main)" }}>
              <ArrowUpRight size={22} className="text-green-500" />
              <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--text-main)" }}>
                Restock Inventory Part
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  Receive stock quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-[#D4F12E] font-mono text-center text-lg font-bold"
                  style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                />
                <p className="text-[10px] font-medium mt-1 text-dim" style={{ color: "var(--text-muted)" }}>
                  This adjustment will log a `RESTOCK` timeline operation and automatically increment the quantity on-hand.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dashed" style={{ borderColor: "var(--border-main)" }}>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border font-bold text-xs bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  onClick={() => setShowRestockModal(false)}
                  disabled={processingRestock}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  disabled={processingRestock || restockQty <= 0}
                >
                  {processingRestock ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Receiving...
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      Confirm Restock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {deletingPartId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="rounded-3xl border w-full max-w-sm p-6 relative animate-scaleIn shadow-2xl" style={{ background: "var(--bg-card)", borderColor: "var(--border-main)" }}>
            <div className="flex items-center gap-2.5 pb-4 border-b border-dashed mb-4" style={{ borderColor: "var(--border-main)" }}>
              <TrendingDown size={22} className="text-red-500" />
              <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--text-main)" }}>
                Deactivate Item Specifications
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Are you sure you want to deactivate the part <span className="text-white font-bold">"{deletingPartName}"</span>? This will make the item unavailable for invoicing, work order reservation, or purchase ordering.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dashed" style={{ borderColor: "var(--border-main)" }}>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border font-bold text-xs bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
                  onClick={() => setDeletingPartId(null)}
                  disabled={processingDelete}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  disabled={processingDelete}
                >
                  {processingDelete ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Deactivating...
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      Confirm Deactivation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
