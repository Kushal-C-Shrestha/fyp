import React, { useEffect, useMemo, useState } from "react";
import Pagination from "./Pagination";

/**
 * DataTable
 *
 * A generic table scaffold shared across the Admin, Hospital, and Doctor panels.
 *
 * Props
 * ─────
 * columns          Array<{ label: string, className?: string }>   Column headers
 * loading          boolean                                         Show loading row
 * loadingText      string                                          Text in loading row
 * emptyText        string                                          Text in empty row
 * emptyIcon        ReactNode                                       Optional icon above empty text
 * data             Array<any>                                      Optional row data
 * renderRow        (row, index) => ReactNode                       Optional row renderer
 * getRowKey        (row, index) => string | number                 Optional row key getter
 * children         ReactNode                                       <tr> elements for <tbody>
 * pagination       boolean                                         Paginate data rows
 * pageSize         number                                          Initial rows per page
 * pageSizeOptions  Array<number>                                   Items per page options
 * wrapperClassName string                                          Override the outer wrapper class
 *                                                                  (e.g. pass "" to remove border-t)
 */
const DataTable = ({
  columns = [],
  data = null,
  renderRow = null,
  getRowKey = null,
  loading = false,
  loadingText = "Loading...",
  emptyText = "No data found.",
  emptyIcon = null,
  children,
  pagination = false,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  resetPageKey = "",
  wrapperClassName = "overflow-x-auto rounded-xl border border-slate-200 bg-white",
  paginationClassName = "px-5 py-4 sm:px-6 lg:px-7 bg-white",
}) => {
  const colSpan = columns.length || 1;
  const usesDataRows = Array.isArray(data) && typeof renderRow === "function";
  const normalizedData = usesDataRows ? data : [];
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState(pageSize);
  const normalizedPageSizeOptions = useMemo(() => {
    const options = pageSizeOptions
      .map((option) => Number(option))
      .filter((option) => Number.isFinite(option) && option > 0);
    return Array.from(new Set([...options, Number(pageSize)])).sort((a, b) => a - b);
  }, [pageSize, pageSizeOptions]);
  const safePageSize = Number.isFinite(Number(selectedPageSize)) && Number(selectedPageSize) > 0 ? Number(selectedPageSize) : 10;
  const totalPages = pagination && usesDataRows ? Math.ceil(normalizedData.length / safePageSize) : 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));

  useEffect(() => {
    setCurrentPage(1);
  }, [resetPageKey]);

  useEffect(() => {
    if (clampedPage !== currentPage) setCurrentPage(clampedPage);
  }, [clampedPage, currentPage]);

  useEffect(() => {
    setSelectedPageSize(pageSize);
  }, [pageSize]);

  const pageRows = useMemo(() => {
    if (!usesDataRows || !pagination) return normalizedData;
    const startIndex = (clampedPage - 1) * safePageSize;
    return normalizedData.slice(startIndex, startIndex + safePageSize);
  }, [clampedPage, normalizedData, pagination, safePageSize, usesDataRows]);

  const hasRows = usesDataRows ? pageRows.length > 0 : React.Children.count(children) > 0;

  const goToPage = (page) => setCurrentPage(Math.min(Math.max(page, 1), Math.max(totalPages, 1)));

  return (
    <>
      <div className={wrapperClassName}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-700">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key || col.label || i}
                  className={`px-5 py-3.5 font-bold${col.className ? ` ${col.className}` : ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-5 py-8 text-sm text-slate-500 sm:px-6 lg:px-7"
                >
                  {loadingText}
                </td>
              </tr>
            ) : hasRows ? (
              usesDataRows ? (
                pageRows.map((row, index) => (
                  <React.Fragment key={getRowKey?.(row, index) ?? row?.id ?? row?.request_id ?? row?.appointment_id ?? index}>
                    {renderRow(row, (clampedPage - 1) * safePageSize + index)}
                  </React.Fragment>
                ))
              ) : (
                children
              )
            ) : (
              <tr>
                <td colSpan={colSpan} className="px-5 py-8 sm:px-6 lg:px-7">
                  <div className="flex flex-col items-center gap-2 text-center">
                    {emptyIcon && (
                      <span className="text-slate-300">{emptyIcon}</span>
                    )}
                    <p className="text-sm text-slate-600">{emptyText}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {pagination && usesDataRows ? (
            <tfoot>
              <tr>
                <td colSpan={colSpan} className="p-0 border-t border-slate-100">
                  <div className={paginationClassName}>
                    <Pagination
                      page={clampedPage}
                      totalPages={totalPages}
                      totalItems={normalizedData.length}
                      pageSize={safePageSize}
                      pageSizeOptions={normalizedPageSizeOptions}
                      onPageChange={goToPage}
                      onPageSizeChange={(nextSize) => {
                        setSelectedPageSize(nextSize);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </>
  );
};

export default DataTable;
