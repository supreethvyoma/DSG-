function SalesChart({ orders = [] }) {
  const monthlyTotals = {};

  orders.forEach((order) => {
    const date = new Date(order?.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(order?.total || 0);
  });

  const points = Object.entries(monthlyTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);

  const maxValue = Math.max(...points.map(([, value]) => value), 1);
  const chartHeight = 160;
  const chartWidth = 520;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;
  const polylinePoints = points
    .map(([, value], index) => {
      const x = Math.round(index * stepX);
      const y = Math.round(chartHeight - (value / maxValue) * (chartHeight - 16));
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="sales-chart">
      <h3 style={{ margin: "0 0 14px" }}>Sales Revenue (Last 6 Months)</h3>
      {points.length === 0 ? (
        <p style={{ margin: 0, color: "#6b7280" }}>No order data yet.</p>
      ) : (
        <div className="sales-line-chart">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            <polyline className="sales-line" points={polylinePoints} />
            {points.map(([, value], index) => {
              const x = Math.round(index * stepX);
              const y = Math.round(chartHeight - (value / maxValue) * (chartHeight - 16));

              return <circle key={`${x}-${y}`} className="sales-point" cx={x} cy={y} r="4" />;
            })}
          </svg>
        </div>
      )}
      {points.length > 0 && (
        <div className="sales-line-labels">
          {points.map(([month, value]) => (
            <div key={month}>
              <span>{month}</span>
              <strong>Rs {Math.round(value)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SalesChart;
