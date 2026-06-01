export default function LicenseHealthBadge({ lic }: { lic: any }) {
  const expired = lic.expiresAt && new Date(lic.expiresAt) < new Date() && lic.status === "active";
  const daysLeft = lic.expiresAt ? Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000) : null;

  if (lic.status === "revoked") {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Revoked</span>;
  }
  if (expired) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Expired</span>;
  }
  if (daysLeft !== null && daysLeft <= 7) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-400 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> {daysLeft}d left</span>;
  }
  if (lic.status === "active") {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/10 text-gray-400 flex items-center gap-1 w-fit">{lic.status}</span>;
}
