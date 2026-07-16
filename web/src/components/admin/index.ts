// The admin panel reuses the owner portal's design system directly — the
// token interface (OwnerTheme) and every component built on it are fully
// generic (colors, spacing, shadows), so there's no need to fork them.
export {
  getOwnerTheme as getAdminTheme,
  chipTint, statusColor, STATUS_COLORS,
  Card, CardHeader,
  StatusBadge, Pill,
  Button,
  StatCard,
  EmptyState,
  PageHeader, Breadcrumb,
  DataTable,
  useToast, OwnerToastProvider,
  ConfirmDialog,
  StatCardSkeleton, ChartSkeleton, TableSkeleton, CardListSkeleton,
  useCountUp,
} from "@/components/owner";
export type { OwnerTheme, Column } from "@/components/owner";

export * from "./AdminData";
export * from "./Drawer";
