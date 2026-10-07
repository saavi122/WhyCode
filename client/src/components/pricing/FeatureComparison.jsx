import React from "react";
import { Check, Minus } from "lucide-react";

export default function FeatureComparison({ categories, plans }) {
  const renderCell = (value) => {
    if (value === true || value === "✓") {
      return (
        <span className="comparison-check">
          <Check size={16} className="check-icon" />
        </span>
      );
    }
    if (value === false || value === "—") {
      return (
        <span className="comparison-dash">
          <Minus size={14} className="dash-icon" />
        </span>
      );
    }
    if (value === "Limited" || value === "Basic") {
      return <span className="comparison-pill pill-limited">{value}</span>;
    }
    if (value === "Custom") {
      return <span className="comparison-pill pill-custom">{value}</span>;
    }
    return <span className="comparison-text">{value}</span>;
  };

  return (
    <div className="feature-comparison-wrapper">
      <div className="comparison-header-section">
        <h2 className="comparison-title">Compare plans</h2>
        <p className="comparison-subtitle">
          Detailed technical breakdown of capabilities, quotas, and workspace controls across all WhyCode tiers.
        </p>
      </div>

      <div className="comparison-table-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="th-feature-name">Features &amp; Capabilities</th>
              {plans.map((p) => (
                <th key={p.id} className={`th-plan ${p.popular ? "th-popular" : ""}`}>
                  <div className="th-plan-wrap">
                    <span className="th-plan-name">{p.name}</span>
                    <span className="th-plan-price">{p.price}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, catIdx) => (
              <React.Fragment key={catIdx}>
                <tr className="category-header-row">
                  <td colSpan={plans.length + 1} className="category-header-title">
                    {cat.category}
                  </td>
                </tr>
                {cat.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="feature-row">
                    <td className="td-feature-name">
                      <span className="feature-row-title">{row.name}</span>
                      {row.hint && <span className="feature-row-hint">{row.hint}</span>}
                    </td>
                    <td className="td-value td-free">
                      <div className="comparison-cell-wrap">{renderCell(row.free)}</div>
                    </td>
                    <td className="td-value td-startup">
                      <div className="comparison-cell-wrap">{renderCell(row.startup)}</div>
                    </td>
                    <td className="td-value td-team td-highlight">
                      <div className="comparison-cell-wrap">{renderCell(row.team)}</div>
                    </td>
                    <td className="td-value td-custom">
                      <div className="comparison-cell-wrap">{renderCell(row.custom)}</div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
