import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  columns: string[];
  data: Record<string, any>[];
  pageSize?: number;
  loading?: boolean;
}

const TRUNCATE_LEN = 60;

function truncate(val: any): string {
  const str = val === null || val === undefined ? '—' : String(val);
  if (str.length > TRUNCATE_LEN) return str.slice(0, TRUNCATE_LEN) + '…';
  return str;
}

const SkeletonRow: React.FC<{ cols: number }> = ({ cols }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td
        key={i}
        style={{ padding: '10px 14px', borderBottom: '1px solid rgba(99,102,241,0.08)' }}
      >
        <div
          className="skeleton"
          style={{
            height: 14,
            borderRadius: 4,
            width: `${50 + Math.random() * 40}%`,
            background: 'linear-gradient(90deg, rgba(37,40,54,1) 25%, rgba(45,47,62,1) 50%, rgba(37,40,54,1) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </td>
    ))}
  </tr>
);

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  pageSize = 10,
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const pageData = data.slice(startIdx, startIdx + pageSize);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div style={{ width: '100%' }}>
      {/* Add shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
        <table
          className="data-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            minWidth: 400,
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '11px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'rgba(148,163,184,0.6)',
                    backgroundColor: '#252836',
                    borderBottom: '1px solid rgba(99,102,241,0.15)',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'rgba(148,163,184,0.45)',
                    fontSize: 13,
                  }}
                >
                  No data to display
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIdx) => (
                <motion.tr
                  key={startIdx + rowIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rowIdx * 0.025, duration: 0.2 }}
                  style={{
                    backgroundColor:
                      rowIdx % 2 === 0 ? '#1a1d27' : 'rgba(37,40,54,0.5)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                      'rgba(99,102,241,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                      rowIdx % 2 === 0 ? '#1a1d27' : 'rgba(37,40,54,0.5)';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      title={String(row[col] ?? '')}
                      style={{
                        padding: '9px 14px',
                        borderBottom: '1px solid rgba(99,102,241,0.07)',
                        color: '#cbd5e1',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {truncate(row[col])}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          padding: '0 4px',
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: 'rgba(148,163,184,0.55)',
          }}
        >
          {loading
            ? 'Loading…'
            : `Showing ${data.length === 0 ? 0 : startIdx + 1}–${Math.min(
                startIdx + pageSize,
                data.length
              )} of ${data.length} rows`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handlePrev}
            disabled={currentPage === 1 || loading}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: '1px solid rgba(99,102,241,0.2)',
              backgroundColor: 'rgba(99,102,241,0.08)',
              color:
                currentPage === 1 ? 'rgba(148,163,184,0.3)' : '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <ChevronLeft size={14} />
          </button>

          <span
            style={{
              fontSize: 12,
              color: '#a5b4fc',
              fontWeight: 600,
              minWidth: 60,
              textAlign: 'center',
            }}
          >
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={handleNext}
            disabled={currentPage === totalPages || loading}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: '1px solid rgba(99,102,241,0.2)',
              backgroundColor: 'rgba(99,102,241,0.08)',
              color:
                currentPage === totalPages
                  ? 'rgba(148,163,184,0.3)'
                  : '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor:
                currentPage === totalPages ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
