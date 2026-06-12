import api from "./api";

export interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  country: string;
  branchManager?:
    | {
        _id: string;
        fullName: string;
        email: string;
      }
    | string;
  countryManager?:
    | {
        _id: string;
        fullName: string;
        email: string;
      }
    | string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  type?: "BRANCH" | "WORKSHOP";
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBranchPayload {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  country: string;
  countryManager?: string;
  managerId?: string;
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  type?: "BRANCH" | "WORKSHOP";
}

export interface UpdateBranchPayload extends Partial<CreateBranchPayload> {
  id: string;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMetadata;
}

export interface BranchFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  type?: "BRANCH" | "WORKSHOP";
  country?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// GET all branches
export const getAllBranches = async (
  filters: BranchFilters = {},
): Promise<PaginatedResponse<Branch>> => {
  const response = await api.get("/api/branch", {
    params: filters,
  });
  return response.data;
};

// GET single branch
export const getBranchById = async (id: string): Promise<Branch> => {
  const response = await api.get(`/api/branch/${id}`);
  return response.data.data;
};

// POST create branch
export const createBranch = async (
  payload: CreateBranchPayload,
): Promise<Branch> => {
  const response = await api.post("/api/branch", payload);
  return response.data;
};

// PUT update branch
export const updateBranch = async (
  payload: UpdateBranchPayload,
): Promise<Branch> => {
  const response = await api.put("/api/branch/", payload);
  return response.data;
};

// DELETE branch
export const deleteBranch = async (id: string): Promise<void> => {
  await api.delete(`/api/branch/${id}`);
};

// GET extended branch details with analytics
export const getBranchExtendedDetails = async (
  id: string,
  startDate?: string,
  endDate?: string,
): Promise<any> => {
  const response = await api.get(`/api/branch/${id}/details`, {
    params: { startDate, endDate },
  });
  return response.data.data;
};
