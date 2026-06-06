import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Trash2, Edit2, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import Breadcrumbs from "../../../components/dashboard/shared/Breadcrumbs";
import { getAllBranches } from "../../../services/branchService";
import api from "../../../services/api";

interface Workshop {
  _id: string;
  name: string;
  code: string;
  branchId: string | { _id: string; name: string };
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  createdBy?: string;
  isDeleted?: boolean;
}

interface Branch {
  _id: string;
  name: string;
}

const ManageWorkshops = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "SUSPENDED"
  >("ALL");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null,
  );
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    branchId: "",
    status: "ACTIVE" as const,
  });

  const [deleteTarget, setDeleteTarget] = useState<Workshop | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [branchesRes, workshopsRes] = await Promise.all([
          getAllBranches(),
          api.get("/api/workshop"),
        ]);

        setBranches(branchesRes.data || []);
        setWorkshops(workshopsRes.data?.data || []);
      } catch (err: any) {
        setError(
          err.response?.data?.message || err.message || "Failed to fetch data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create workshop
  const handleCreate = async () => {
    setFormLoading(true);
    setFormError("");

    try {
      const response = await api.post("/api/workshop", {
        name: formData.name,
        code: formData.code,
        branchId: formData.branchId,
        status: formData.status,
      });

      setWorkshops([...workshops, response.data.data]);
      toast.success(
        t("management.workshop.created", {
          defaultValue: "Workshop created successfully",
        }),
      );
      closeModal();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create workshop",
      );
    } finally {
      setFormLoading(false);
    }
  };

  // Update workshop
  const handleUpdate = async () => {
    if (!selectedWorkshop) return;

    setFormLoading(true);
    setFormError("");

    try {
      const response = await api.put(`/api/workshop/${selectedWorkshop._id}`, {
        name: formData.name,
        code: formData.code,
        branchId: formData.branchId,
        status: formData.status,
      });

      setWorkshops(
        workshops.map((w) =>
          w._id === selectedWorkshop._id ? response.data.data : w,
        ),
      );
      toast.success(
        t("management.workshop.updated", {
          defaultValue: "Workshop updated successfully",
        }),
      );
      closeModal();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update workshop",
      );
    } finally {
      setFormLoading(false);
    }
  };

  // Delete workshop
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/api/workshop/${deleteTarget._id}`);
      setWorkshops(workshops.filter((w) => w._id !== deleteTarget._id));
      toast.success(
        t("management.workshop.deleted", {
          defaultValue: "Workshop deleted successfully",
        }),
      );
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete workshop",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", code: "", branchId: "", status: "ACTIVE" });
    setFormError("");
    setModalMode("create");
    setSelectedWorkshop(null);
    setShowModal(true);
  };

  const openEditModal = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setFormData({
      name: workshop.name,
      code: workshop.code,
      branchId:
        typeof workshop.branchId === "object"
          ? workshop.branchId._id
          : workshop.branchId,
      status: workshop.status,
    });
    setFormError("");
    setModalMode("edit");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalMode(null);
    setSelectedWorkshop(null);
    setFormData({ name: "", code: "", branchId: "", status: "ACTIVE" });
    setFormError("");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError("Workshop name is required");
      return;
    }
    if (!formData.code.trim()) {
      setFormError("Workshop code is required");
      return;
    }
    if (!formData.branchId) {
      setFormError("Branch is required");
      return;
    }

    if (modalMode === "create") {
      handleCreate();
    } else if (modalMode === "edit") {
      handleUpdate();
    }
  };

  // Filter workshops
  const filteredWorkshops = workshops.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch =
      branchFilter === "ALL" ||
      (typeof w.branchId === "object" ? w.branchId._id : w.branchId) ===
        branchFilter;

    const matchesStatus = statusFilter === "ALL" || w.status === statusFilter;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const getBranchName = (branchId: string | { _id: string; name: string }) => {
    if (typeof branchId === "object") return branchId.name;
    return branches.find((b) => b._id === branchId)?.name || branchId;
  };

  return (
    <div
      className="w-full h-full overflow-y-auto"
      style={{ background: "var(--bg-main)" }}
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            {
              label: t("sidebar.items.administration", {
                defaultValue: "Administration",
              }),
              active: false,
            },
            {
              label: t("management.workshop.title", {
                defaultValue: "Manage Workshops",
              }),
              active: true,
            },
          ]}
        />

        {/* Header */}
        <div className="mt-6 mb-6">
          <h1
            className="text-4xl font-black transition-colors"
            style={{ color: "var(--text-main)" }}
          >
            {t("management.workshop.title", {
              defaultValue: "Manage Workshops",
            })}
          </h1>
          <p
            className="text-sm mt-1 transition-colors"
            style={{ color: "var(--text-dim)" }}
          >
            {t("management.workshop.subtitle", {
              defaultValue:
                "Create and manage workshop entities across branches",
            })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div
            className="p-4 rounded-lg transition-colors"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-main)",
            }}
          >
            <p
              className="text-xs transition-colors uppercase tracking-widest font-semibold"
              style={{ color: "var(--text-dim)" }}
            >
              {t("management.common.total")}
            </p>
            <h3
              className="text-3xl font-black transition-colors"
              style={{ color: "var(--text-main)" }}
            >
              {workshops.length}
            </h3>
          </div>
          <div
            className="p-4 rounded-lg transition-colors"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-main)",
            }}
          >
            <p
              className="text-xs transition-colors uppercase tracking-widest font-semibold"
              style={{ color: "var(--text-dim)" }}
            >
              {t("management.common.active")}
            </p>
            <h3
              className="text-3xl font-black transition-colors"
              style={{ color: "var(--brand-lime)" }}
            >
              {workshops.filter((w) => w.status === "ACTIVE").length}
            </h3>
          </div>
        </div>

        {/* Create Button */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all"
            style={{
              background: "var(--brand-lime)",
              color: "var(--brand-black)",
            }}
          >
            <Plus size={20} />{" "}
            {t("management.workshop.create", {
              defaultValue: "Create Workshop",
            })}
          </button>
        </div>

        {/* Filters */}
        <div
          className="p-4 rounded-lg mb-6 transition-colors"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-main)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3"
                style={{ color: "var(--text-dim)" }}
              />
              <input
                type="text"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg border transition-colors"
                style={{
                  background: "var(--bg-main)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
              />
            </div>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border transition-colors"
              style={{
                background: "var(--bg-main)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="ALL">
                {t("common.allBranches", { defaultValue: "All Branches" })}
              </option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-lg border transition-colors"
              style={{
                background: "var(--bg-main)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="ALL">
                {t("common.allStatuses", { defaultValue: "All Statuses" })}
              </option>
              <option value="ACTIVE">{t("common.active")}</option>
              <option value="INACTIVE">{t("common.inactive")}</option>
              <option value="SUSPENDED">{t("common.suspended")}</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="p-4 rounded-lg mb-6 border"
            style={{
              background: "rgba(255, 0, 0, 0.1)",
              borderColor: "rgba(255, 0, 0, 0.3)",
              color: "#ff4444",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw
              className="animate-spin"
              size={32}
              style={{ color: "var(--text-dim)" }}
            />
          </div>
        ) : (
          <>
            {/* Table */}
            <div
              className="overflow-x-auto rounded-lg border transition-colors"
              style={{ borderColor: "var(--border-main)" }}
            >
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-card)",
                      borderBottom: "1px solid var(--border-main)",
                    }}
                  >
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("common.name")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("common.code")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("common.branch")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("common.status")}
                    </th>
                    <th
                      className="px-4 py-3 text-center text-sm font-semibold"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkshops.length > 0 ? (
                    filteredWorkshops.map((workshop) => (
                      <tr
                        key={workshop._id}
                        style={{ borderBottom: "1px solid var(--border-main)" }}
                      >
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: "var(--text-main)" }}
                        >
                          {workshop.name}
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {workshop.code}
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {getBranchName(workshop.branchId)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className="px-2 py-1 rounded text-xs font-semibold"
                            style={{
                              background:
                                workshop.status === "ACTIVE"
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : workshop.status === "INACTIVE"
                                    ? "rgba(107, 114, 128, 0.2)"
                                    : "rgba(239, 68, 68, 0.2)",
                              color:
                                workshop.status === "ACTIVE"
                                  ? "#22c55e"
                                  : workshop.status === "INACTIVE"
                                    ? "#6b7280"
                                    : "#ef4444",
                            }}
                          >
                            {workshop.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditModal(workshop)}
                              className="p-1 rounded hover:opacity-70 transition"
                              style={{ color: "var(--text-dim)" }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(workshop)}
                              className="p-1 rounded hover:opacity-70 transition text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <p style={{ color: "var(--text-dim)" }}>
                          {t("common.noData", {
                            defaultValue: "No workshops found",
                          })}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="rounded-lg shadow-lg w-full max-w-md"
              style={{ background: "var(--bg-card)" }}
            >
              <div
                className="p-6 border-b"
                style={{ borderColor: "var(--border-main)" }}
              >
                <h2
                  className="text-xl font-bold"
                  style={{ color: "var(--text-main)" }}
                >
                  {modalMode === "create"
                    ? t("management.workshop.createTitle", {
                        defaultValue: "Create Workshop",
                      })
                    : t("management.workshop.editTitle", {
                        defaultValue: "Edit Workshop",
                      })}
                </h2>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div
                    className="p-3 rounded border text-sm"
                    style={{
                      background: "rgba(255, 0, 0, 0.1)",
                      borderColor: "rgba(255, 0, 0, 0.3)",
                      color: "#ff4444",
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div>
                  <label
                    className="block text-sm font-semibold mb-1"
                    style={{ color: "var(--text-main)" }}
                  >
                    {t("common.name")}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border transition-colors"
                    style={{
                      background: "var(--bg-main)",
                      borderColor: "var(--border-main)",
                      color: "var(--text-main)",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-1"
                    style={{ color: "var(--text-main)" }}
                  >
                    {t("common.code")}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border transition-colors"
                    style={{
                      background: "var(--bg-main)",
                      borderColor: "var(--border-main)",
                      color: "var(--text-main)",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-1"
                    style={{ color: "var(--text-main)" }}
                  >
                    {t("common.branch")}
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) =>
                      setFormData({ ...formData, branchId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded border transition-colors"
                    style={{
                      background: "var(--bg-main)",
                      borderColor: "var(--border-main)",
                      color: "var(--text-main)",
                    }}
                  >
                    <option value="">
                      {t("common.selectBranch", {
                        defaultValue: "Select a branch",
                      })}
                    </option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-1"
                    style={{ color: "var(--text-main)" }}
                  >
                    {t("common.status")}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded border transition-colors"
                    style={{
                      background: "var(--bg-main)",
                      borderColor: "var(--border-main)",
                      color: "var(--text-main)",
                    }}
                  >
                    <option value="ACTIVE">{t("common.active")}</option>
                    <option value="INACTIVE">{t("common.inactive")}</option>
                    <option value="SUSPENDED">{t("common.suspended")}</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 rounded font-semibold transition-colors"
                    style={{
                      background: "var(--bg-main)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-main)",
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 rounded font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: "var(--brand-lime)",
                      color: "var(--brand-black)",
                    }}
                  >
                    {formLoading ? (
                      <RefreshCw
                        className="inline animate-spin mr-2"
                        size={16}
                      />
                    ) : null}
                    {modalMode === "create"
                      ? t("common.create")
                      : t("common.update")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="rounded-lg shadow-lg w-full max-w-md"
              style={{ background: "var(--bg-card)" }}
            >
              <div
                className="p-6 border-b"
                style={{ borderColor: "var(--border-main)" }}
              >
                <h2
                  className="text-xl font-bold"
                  style={{ color: "var(--text-main)" }}
                >
                  {t("common.confirmDelete", {
                    defaultValue: "Confirm Delete",
                  })}
                </h2>
              </div>

              <div className="p-6">
                <p style={{ color: "var(--text-dim)" }}>
                  {t("management.workshop.deleteConfirm", {
                    defaultValue: `Are you sure you want to delete the workshop "${deleteTarget.name}"? This action cannot be undone.`,
                  })}
                </p>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 px-4 py-2 rounded font-semibold transition-colors"
                    style={{
                      background: "var(--bg-main)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-main)",
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2 rounded font-semibold transition-all disabled:opacity-50 text-white"
                    style={{ background: "#ef4444" }}
                  >
                    {deleteLoading ? (
                      <RefreshCw
                        className="inline animate-spin mr-2"
                        size={16}
                      />
                    ) : null}
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageWorkshops;
