import { Coffee, Wifi, ParkingCircle, ShoppingCart, LucideIcon } from "lucide-react";

export const AMENITY_META: Record<string, { Icon: LucideIcon; label: string }> = {
  cafe:    { Icon: Coffee,        label: "Café nearby"       },
  coffee:  { Icon: Coffee,        label: "Coffee"            },
  wifi:    { Icon: Wifi,          label: "Free Wi-Fi"        },
  parking: { Icon: ParkingCircle, label: "Free parking"      },
  store:   { Icon: ShoppingCart,  label: "Convenience store" },
};
