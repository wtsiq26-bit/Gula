export default function SkeletonTable({ columns = 5, rows = 5 }) {
  return (
    <div className="w-full bg-surface-container-lowest dark:bg-gray-800 rounded-xl border border-border-light dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low dark:bg-gray-900/50 border-b border-border-light dark:border-gray-700">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border-light dark:border-gray-700/50 last:border-0">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-4">
                    <div 
                      className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" 
                      style={{ width: `${Math.random() * 40 + 40}%` }}
                    ></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
