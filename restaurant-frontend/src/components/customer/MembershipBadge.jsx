import { MEMBERSHIP } from "./membershipConfig";

export default function MembershipBadge({ level }) {
  const cfg = MEMBERSHIP[level] || MEMBERSHIP.thuong;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${cfg.badge}`}>
      <Icon size={12} weight="fill" />
      {cfg.label}
    </span>
  );
}
