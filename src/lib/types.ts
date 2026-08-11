import type { $Enums } from "@/generated/prisma/client";

export type TyreStatus = $Enums.TyreStatus;
export type EntityStatus = $Enums.EntityStatus;
export type Side = $Enums.Side;
export type PositionType = $Enums.PositionType;
export type LifecycleEventType = $Enums.LifecycleEventType;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface PositionWithTyre {
  id: string;
  positionId: string;
  displayName: string;
  shortCode: string;
  side: Side;
  sequence: number;
  positionType: PositionType;
  status: EntityStatus;
  axle: {
    id: string;
    axleNumber: number;
    name: string;
    sequence: number;
  };
  currentTyre?: {
    id: string;
    internalId: string;
    status: TyreStatus;
    tyreModel: {
      id: string;
      brand: string;
      name: string;
      size: string;
    };
    currentInstallation?: {
      id: string;
      installedAt: Date;
      odometer: number;
      driver?: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
}