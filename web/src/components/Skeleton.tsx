export function Skeleton({ width = "100%", height = 14, radius = 8, style }: {
  width?: number | string; height?: number | string; radius?: number; style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function TripsSkeleton({ cardBg, cardBorder }: { cardBg: string; cardBorder: string }) {
  return (
    <div>
      <div className="trips-stats-grid" style={{ marginBottom: 28 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px" }}>
            <Skeleton width={34} height={34} radius={10} style={{ marginBottom: 14 }} />
            <Skeleton width={70} height={24} radius={6} style={{ marginBottom: 8 }} />
            <Skeleton width={90} height={12} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
            <Skeleton width={44} height={44} radius={14} />
            <div style={{ flex: 1 }}>
              <Skeleton width={100} height={18} radius={999} style={{ marginBottom: 10 }} />
              <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width={140} height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingDetailSkeleton({ cardBg, cardBorder }: { cardBg: string; cardBorder: string }) {
  const card = { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16 };
  return (
    <div>
      <div style={card}>
        <Skeleton width={110} height={26} radius={999} style={{ marginBottom: 20 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} width={32} height={32} radius={999} />)}
        </div>
      </div>
      <div style={card}>
        <Skeleton width={80} height={11} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Skeleton width={48} height={48} radius={14} />
          <div style={{ flex: 1 }}>
            <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="45%" height={13} />
          </div>
        </div>
      </div>
      <div style={card}>
        <Skeleton width={80} height={11} style={{ marginBottom: 14 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 10 }} />
        <Skeleton width="100%" height={14} />
      </div>
    </div>
  );
}
