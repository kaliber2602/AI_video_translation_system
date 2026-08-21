import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthBackLinkProps {
  to: string;
  label: string;
}

export default function AuthBackLink({
  to,
  label,
}: AuthBackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-[#22c7a9]"
    >
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}