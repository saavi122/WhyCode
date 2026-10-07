import React, { useState } from "react";
import { ShieldAlert, FileText, ChevronDown, ChevronUp, ArrowRight, Code2 } from "lucide-react";

export default function DriftView({ data, onUserAction }) {
  const [expandedId, setExpandedId] = useState("readme");

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (onUserAction) onUserAction();
  };

  return (
    <div className="preview-view-container drift-view">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-left">
          <h3 className="view-headline">{data.title}</h3>
          <span className="view-alert-badge">
            <ShieldAlert size={12} />
            <span>{data.countBadge} desynchronized docs</span>
          </span>
        </div>
      </div>

      {/* Main Visual: List of Drifted Docs */}
      <div className="drift-docs-list">
        {data.items.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className={`drift-doc-item ${isExpanded ? "expanded" : ""}`}
            >
              <div
                className="drift-item-summary-row"
                onClick={() => toggleExpand(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && toggleExpand(item.id)}
              >
                <div className="drift-item-left">
                  <FileText size={16} className="text-warning" />
                  <div className="drift-file-info">
                    <span className="drift-filename">{item.file}</span>
                    <span className="drift-file-summary">{item.summary}</span>
                  </div>
                </div>

                <div className="drift-item-right">
                  <span className="drift-status-chip">{item.status}</span>
                  <button
                    className="drift-review-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(item.id);
                    }}
                  >
                    <span>{isExpanded ? "Close" : "Review"}</span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {/* Secondary Element: Expanded Before/After Diff Snippet */}
              {isExpanded && (
                <div className="drift-diff-panel">
                  <div className="diff-columns-grid">
                    {/* Code Change Side */}
                    <div className="diff-col diff-code-col">
                      <div className="diff-col-header">
                        <Code2 size={12} className="text-cyan" />
                        <span>{item.diff.codeTitle}</span>
                      </div>
                      <div className="diff-snippet-box">
                        {item.diff.codeLines.map((line, lIdx) => (
                          <div
                            key={lIdx}
                            className={`diff-line line-${line.type}`}
                          >
                            <span className="diff-line-marker">
                              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                            </span>
                            <span className="diff-line-text">{line.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Document Spec Side */}
                    <div className="diff-col diff-doc-col">
                      <div className="diff-col-header">
                        <FileText size={12} className="text-warning" />
                        <span>{item.diff.docTitle}</span>
                      </div>
                      <div className="diff-snippet-box doc-snippet-box">
                        <div className="diff-doc-content">
                          <span className="doc-warning-tag">Drift Alert:</span>
                          <code>{item.diff.docSnippet}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
