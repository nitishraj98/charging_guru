interface StationPinProps {
  color?: string;
  count?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function StationPin({ color = "#00E676", count, onClick, style }: StationPinProps) {
  return (
    <span
      onClick={onClick}
      style={{
        position: "absolute", transform: "translate(-50%,-100%)", zIndex: 5,
        cursor: onClick ? "pointer" : "default", transition: ".2s cubic-bezier(.34,1.56,.64,1)",
        display: "inline-block", ...style,
      }}
    >
      <svg width="34" height="42" viewBox="0 0 30 38">
        <path d={`M15 1C8 1 3 6 3 12.6 3 20 15 30 15 30s12-10 12-17.4C27 6 22 1 15 1Z`}
          fill="#101415" stroke={color} strokeWidth="2" />
        {color === "#00E676" && (
          <path fill="#00E676" d="M16 7 11 16h3l-1 6 5-8h-3l1-7Z" />
        )}
      </svg>
      {count !== undefined && (
        <span style={{
          position: "absolute", top: -6, right: -8,
          background: "#050708", border: "1px solid #495154",
          color: "#E6EBED", fontSize: 9, fontWeight: 700,
          borderRadius: 8, padding: "1px 4px",
          fontFamily: "'JetBrains Mono',monospace",
        }}>{count}</span>
      )}
    </span>
  );
}
