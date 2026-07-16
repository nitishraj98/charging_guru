"use client";
import { useMemo, useState } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { OwnerTheme } from "./theme";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  width?: string;
  align?: "left" | "right" | "center";
}

export function DataTable<T>({
  th, columns, rows, rowKey, searchPlaceholder, searchFn,
  onRowClick, pageSize = 10, emptyState, toolbarExtra,
}: {
  th: OwnerTheme; columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string;
  searchPlaceholder?: string; searchFn?: (row: T, query: string) => boolean;
  onRowClick?: (row: T) => void; pageSize?: number;
  emptyState?: React.ReactNode; toolbarExtra?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchFn) return rows;
    return rows.filter(r => searchFn(r, query.trim().toLowerCase()));
  }, [rows, query, searchFn]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); return; }
    setSortDir(d => d === "desc" ? "asc" : "desc");
  }

  return (
    <div>
      {(searchFn || toolbarExtra) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {searchFn && (
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <Search size={14} color={th.textMuted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder={searchPlaceholder ?? "Search…"}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "9px 14px 9px 36px", borderRadius: 10,
                  background: th.raised, border: `1px solid ${th.border}`, color: th.text, fontSize: 13,
                  outline: "none", fontFamily: th.sans,
                }}
              />
            </div>
          )}
          {toolbarExtra}
        </div>
      )}

      {rows.length === 0 && emptyState ? emptyState : (
        <>
          <div style={{ border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden", background: th.card }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: th.raised, borderBottom: `1px solid ${th.border}` }}>
                    {columns.map(col => (
                      <th key={col.key}
                        onClick={col.sortValue ? () => toggleSort(col.key) : undefined}
                        style={{
                          padding: "11px 16px", textAlign: col.align ?? "left", fontSize: 10.5, fontWeight: 700,
                          letterSpacing: ".07em", textTransform: "uppercase", color: th.textMuted,
                          cursor: col.sortValue ? "pointer" : "default", userSelect: "none", width: col.width,
                          whiteSpace: "nowrap", position: "sticky", top: 0,
                        }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {col.header}
                          {col.sortValue && (
                            sortKey === col.key
                              ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
                              : <ChevronsUpDown size={11} style={{ opacity: 0.4 }} />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(row => (
                    <tr
                      key={rowKey(row)}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={onRowClick ? "owner-table-row" : undefined}
                      style={{ borderBottom: `1px solid ${th.border}`, cursor: onRowClick ? "pointer" : "default" }}
                    >
                      {columns.map(col => (
                        <td key={col.key} style={{ padding: "13px 16px", fontSize: 13, color: th.text, textAlign: col.align ?? "left" }}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: th.textSub }}>
                        No results match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {sorted.length > pageSize && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <span style={{ fontSize: 12, color: th.textSub }}>
                {(clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, sorted.length)} of {sorted.length}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={clampedPage === 1} style={pagerBtnStyle(th, clampedPage === 1)}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ display: "flex", alignItems: "center", padding: "0 10px", fontSize: 12.5, color: th.text, fontWeight: 600 }}>
                  {clampedPage} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={clampedPage === totalPages} style={pagerBtnStyle(th, clampedPage === totalPages)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function pagerBtnStyle(th: OwnerTheme, disabled: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center",
    background: th.card, border: `1px solid ${th.border}`, color: disabled ? th.textMuted : th.text,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  };
}
