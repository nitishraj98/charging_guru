"use client";
import { OwnerTheme } from "./theme";
import { PricingBreakdown } from "@/lib/api";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PriceLineItem({
  th, label, detail, amountPaise, emphasis, isDiscount,
}: {
  th: OwnerTheme; label: string; detail?: string; amountPaise: number;
  emphasis?: boolean; isDiscount?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: emphasis ? "14px 0 2px" : "9px 0",
      borderTop: emphasis ? `1.5px solid ${th.border}` : "none",
      marginTop: emphasis ? 8 : 0,
    }}>
      <div>
        <div style={{
          fontSize: emphasis ? 14 : 13, fontWeight: emphasis ? 800 : 500,
          color: emphasis ? th.text : th.textSub,
        }}>{label}</div>
        {detail && (
          <div style={{ fontSize: 11, color: th.textMuted, marginTop: 2 }}>{detail}</div>
        )}
      </div>
      <div style={{
        fontFamily: th.mono, fontSize: emphasis ? 20 : 13.5,
        fontWeight: emphasis ? 800 : 600,
        color: isDiscount ? th.danger : emphasis ? th.accent : th.text,
        flexShrink: 0, marginLeft: 16,
      }}>
        {isDiscount ? "-" : ""}{rupees(amountPaise)}
      </div>
    </div>
  );
}

export function InvoiceBreakdown({
  th, breakdown, energyRatePaise, compact,
}: {
  th: OwnerTheme; breakdown: PricingBreakdown; energyRatePaise: number; compact?: boolean;
}) {
  return (
    <div style={{ fontSize: compact ? 12 : 13 }}>
      <PriceLineItem
        th={th}
        label="Charging Cost"
        detail={`${breakdown.energy_kwh.toFixed(2)} kWh × ₹${(energyRatePaise / 100).toFixed(2)}`}
        amountPaise={breakdown.energy_cost_paise}
      />
      {breakdown.parking_fee_paise > 0 && (
        <PriceLineItem th={th} label="Parking Fee" amountPaise={breakdown.parking_fee_paise} />
      )}
      {breakdown.idle_fee_paise > 0 && (
        <PriceLineItem th={th} label="Idle Fee" amountPaise={breakdown.idle_fee_paise} />
      )}
      {breakdown.platform_fee_paise > 0 && (
        <PriceLineItem th={th} label="Platform Fee" amountPaise={breakdown.platform_fee_paise} />
      )}
      {breakdown.convenience_fee_paise > 0 && (
        <PriceLineItem th={th} label="Convenience Fee" amountPaise={breakdown.convenience_fee_paise} />
      )}
      {breakdown.discount_amount_paise > 0 && (
        <PriceLineItem th={th} label="Discount" amountPaise={breakdown.discount_amount_paise} isDiscount />
      )}
      {breakdown.gst_amount_paise > 0 && (
        <PriceLineItem th={th} label="GST" amountPaise={breakdown.gst_amount_paise} />
      )}
      <PriceLineItem th={th} label="Total Payable" amountPaise={breakdown.total_paise} emphasis />
    </div>
  );
}
