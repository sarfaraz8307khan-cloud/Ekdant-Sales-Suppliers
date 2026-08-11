import { Icon } from "@/components/ui/icon";

export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&#38;")
    .replace(/</g, "&#60;")
    .replace(/>/g, "&#62;")
    .replace(/"/g, "&#34;");
}

export type SortConfig = { key: string; asc: boolean };

export function ReportToolbar({
  title,
  businessName,
  logo,
  subtitle,
  contentHtml,
  sortOptions = [],
  sort,
  onSortChange,
}: {
  title: string;
  businessName: string;
  logo?: string | null;
  subtitle?: string;
  contentHtml: string;
  sortOptions?: { key: string; label: string }[];
  sort?: SortConfig;
  onSortChange?: (s: SortConfig) => void;
}) {
  const openExport = (printMode: boolean) => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const logoHtml = logo
      ? `<img src="${escapeHtml(logo)}" alt="logo" style="height:40px;width:auto;" />`
      : "";
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(
      title
    )} — ${escapeHtml(businessName)}</title><style>
      *{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px}
      .brand{display:flex;align-items:center;gap:12px;margin-bottom:2px}
      .brand h1{font-size:18px;margin:0}
      .sub{color:#555;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f2f2f2}
      .num{text-align:right;white-space:nowrap}
      .summary{display:flex;gap:16px;margin:12px 0;flex-wrap:wrap}
      .summary div{border:1px solid #ccc;border-radius:6px;padding:8px 14px;min-width:120px}
      .summary .lbl{font-size:11px;color:#555}
      .summary .val{font-size:16px;font-weight:700}
      @media print{body{margin:0}}
    </style></head><body>
      <div class="brand">${logoHtml}<h1>${escapeHtml(businessName)}</h1></div>
      <div class="sub">${escapeHtml(title)}${
        subtitle ? ` · ${escapeHtml(subtitle)}` : ""
      } · Generated ${new Date().toLocaleString()}</div>
      ${contentHtml}
      ${
        printMode
          ? `<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>`
          : ""
      }
    </body></html>`);
    win.document.close();
    win.focus();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="flex gap-2">
        <button
          onClick={() => openExport(true)}
          className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Icon name="download" size={14} /> PDF
        </button>
        <button
          onClick={() => openExport(false)}
          className="h-9 px-3 rounded-lg border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-muted-soft transition-colors"
        >
          <Icon name="printer" size={14} /> Print
        </button>
      </div>
      {sortOptions.length > 0 && sort && onSortChange && (
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={sort.key}
            onChange={(e) => onSortChange({ key: e.target.value, asc: sort.asc })}
            className="h-9 px-2 rounded-lg border border-border text-xs bg-white"
          >
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onSortChange({ key: sort.key, asc: !sort.asc })}
            className="h-9 px-3 rounded-lg border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-muted-soft transition-colors"
            title={sort.asc ? "Currently: Ascending" : "Currently: Descending"}
          >
            <Icon name="arrow-up-down" size={14} />
            {sort.asc ? "Ascending" : "Descending"}
          </button>
          <span className="text-xs text-muted">
            {sort.key === "amount"
              ? sort.asc
                ? "Lowest amount → Highest"
                : "Highest amount → Lowest"
              : null}
          </span>
        </div>
      )}
    </div>
  );
}