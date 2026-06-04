import { Crown, MedalMilitary, Star } from "@phosphor-icons/react";

export const MEMBERSHIP = {
  thuong: {
    label: "Thường",
    icon: Star,
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-600",
    min: 0,
    next: 1000,
  },
  bac: {
    label: "Bạc",
    icon: MedalMilitary,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    min: 1000,
    next: 5000,
  },
  vang: {
    label: "Vàng",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    min: 5000,
    next: null,
  },
};
