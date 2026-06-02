import React from "react";

/**
 * Enterprise Table Component
 * - Flexible columns
 * - Data-driven rendering
 */
const Table = ({ columns = [], data = [] }) => {
  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-200"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-6 text-gray-500"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;