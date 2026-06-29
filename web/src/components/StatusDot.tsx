const COLORS: Record<string, string> = {
  AVAILABLE:   "#00E676",
  BOOKED:      "#FFC043",
  IN_USE:      "#22D3EE",
  OCCUPIED:    "#22D3EE",
  MAINTENANCE: "#FF7849",
  OFFLINE:     "#495154",
  CONFIRMED:   "#00E676",
  PENDING_PAYMENT: "#FFC043",
  IN_PROGRESS: "#22D3EE",
  COMPLETED:   "#495154",
  CANCELLED:   "#FF5A5F",
  EXPIRED:     "#495154",
};

const LABELS: Record<string, string> = {
  AVAILABLE: "Available", BOOKED: "Booked", IN_USE: "In use", OCCUPIED: "In use",
  MAINTENANCE: "Maintenance", OFFLINE: "Offline", CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Awaiting payment", IN_PROGRESS: "In progress",
  COMPLETED: "Completed", CANCELLED: "Cancelled", EXPIRED: "Expired",
};

export default function StatusDot({ status, label }: { status: string; label?: boolean }) {
  const color = COLORS[status] ?? "#495154";
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
      <span style={{ width:9, height:9, borderRadius:"50%", background:color, flexShrink:0, display:"inline-block" }} />
      {label && <span style={{ fontSize:13, color:"#98A1A6" }}>{LABELS[status] ?? status}</span>}
    </span>
  );
}
