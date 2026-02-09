export type PermissionModule = (typeof import("./constants.js").PERMISSION_MODULES)[number];
export type WarehouseType = (typeof import("./constants.js").WAREHOUSE_TYPES)[number];

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
