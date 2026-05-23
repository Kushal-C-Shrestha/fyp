import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const clampPage = (page, totalPages) =>
  Math.min(Math.max(Number(page) || 1, 1), Math.max(Number(totalPages) || 1, 1));

const buildPages = (currentPage, totalPages) => {
  const pages = Math.max(Number(totalPages) || 1, 1);
  const current = clampPage(currentPage, pages);

  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);

  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pages - 1, current + 1);

  if (start > 2) items.push("start-ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < pages - 1) items.push("end-ellipsis");
  items.push(pages);

  return items;
};

const Pagination = ({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = null,
  pageSizeOptions = [],
  onPageChange,
  onPageSizeChange = null,
  itemLabel = "results",
  className = "",
  compact = false,
  showSummary = true,
}) => {
  const safeTotalPages = Math.max(Number(totalPages) || 1, 1);
  const safePage = clampPage(page, safeTotalPages);
  const safeTotalItems = Math.max(Number(totalItems) || 0, 0);
  const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : null;
  const firstVisible = safeTotalItems === 0 || !safePageSize ? 0 : (safePage - 1) * safePageSize + 1;
  const lastVisible = safeTotalItems === 0 || !safePageSize ? 0 : Math.min(safePage * safePageSize, safeTotalItems);

  const normalizedPageSizeOptions = useMemo(() => {
    const options = pageSizeOptions
      .map((option) => Number(option))
      .filter((option) => Number.isFinite(option) && option > 0);
    if (safePageSize) options.push(safePageSize);
    return Array.from(new Set(options)).sort((a, b) => a - b);
  }, [pageSizeOptions, safePageSize]);

  const paginationItems = useMemo(
    () => buildPages(safePage, safeTotalPages),
    [safePage, safeTotalPages],
  );

  const goToPage = (nextPage) => {
    if (typeof onPageChange !== "function") return;
    onPageChange(clampPage(nextPage, safeTotalPages));
  };

  if (safeTotalPages <= 1 && !showSummary) return null;

  return (
    <div className={["flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className].filter(Boolean).join(" ")}>
      {showSummary ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-fit rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
            {safePageSize ? (
              <>
                <span className="font-semibold text-slate-900">{firstVisible}-{lastVisible}</span>
                <span className="mx-1 text-slate-400">of</span>
              </>
            ) : null}
            <span className="font-semibold text-slate-900">{safeTotalItems}</span>
            <span className="ml-1 text-slate-500">{itemLabel}</span>
          </div>

          {typeof onPageSizeChange === "function" && normalizedPageSizeOptions.length > 0 ? (
            <label className="flex h-10 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white pl-3 pr-2 text-sm text-slate-600">
              <span className="whitespace-nowrap">Rows</span>
              <select
                value={safePageSize || normalizedPageSizeOptions[0]}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                className="h-8 rounded-md border-0 bg-slate-50 px-2 text-sm font-semibold text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
              >
                {normalizedPageSizeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <nav className="flex flex-wrap items-center gap-2" aria-label="Pagination">
        <button
          type="button"
          onClick={() => goToPage(safePage - 1)}
          disabled={safePage === 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="sr-only">Previous</span>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          {paginationItems.map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                onClick={() => goToPage(item)}
                className={`inline-flex h-9 ${compact ? "min-w-9" : "min-w-9"} items-center justify-center rounded-lg border px-2 text-sm font-semibold transition ${
                  safePage === item
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="inline-flex h-9 min-w-9 items-center justify-center text-sm font-semibold text-slate-400">
                ...
              </span>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => goToPage(safePage + 1)}
          disabled={safePage === safeTotalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="sr-only">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
