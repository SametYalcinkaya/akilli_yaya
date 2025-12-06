import clsx from "clsx";

const styles = {
    connected: "bg-green-500/20 text-green-300 border-green-500/40",
    connecting: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    disconnected: "bg-slate-700 text-slate-200 border-slate-500/60",
    error: "bg-red-500/20 text-red-200 border-red-500/40",
};

export function StatusBadge({ status = "disconnected" }) {
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                styles[status] || styles.disconnected
            )}
        >
            <span className="h-2 w-2 rounded-full bg-current" />
            {label}
        </span>
    );
}
