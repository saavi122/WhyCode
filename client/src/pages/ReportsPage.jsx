import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  ChevronRight,
  Sparkles,
  Edit3,
  Check,
  X,
  Code2,
  BookOpen,
  GitCommit,
  Layers,
  Send,
  SlidersHorizontal,
} from "lucide-react";

export default function ReportsPage() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // Filter States
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterRepo, setFilterRepo] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Forms
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form data for generation
  const [generateForm, setGenerateForm] = useState({
    repositoryId: "",
    reportType: "DRIFT",
    targetPath: "README.md",
    targetSymbol: "",
  });

  // Form data for Edit & Approve
  const [editForm, setEditForm] = useState({
    title: "",
    summary: "",
    suggestedDoc: "",
    intentDescription: "",
    changeSummary: "",
    notes: "",
  });

  // Form data for Reject
  const [rejectReason, setRejectReason] = useState("");

  const isCompanyAdmin = user?.role === "company" || user?.role === "admin";

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem("token")}`,
    },
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.append("reportType", filterType);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (filterSeverity !== "ALL") params.append("severity", filterSeverity);
      if (filterRepo !== "ALL") params.append("repositoryId", filterRepo);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await axios.get(`/api/reports?${params.toString()}`, getAuthHeaders());
      setReports(res.data || []);
      if (res.data?.length > 0 && !selectedReport) {
        setSelectedReport(res.data[0]);
      } else if (selectedReport) {
        const updated = res.data.find((r) => r._id === selectedReport._id);
        if (updated) setSelectedReport(updated);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const res = await axios.get("/api/repositories", getAuthHeaders());
      setRepositories(res.data || []);
      if (res.data?.length > 0 && !generateForm.repositoryId) {
        setGenerateForm((prev) => ({ ...prev, repositoryId: res.data[0]._id }));
      }
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filterType, filterStatus, filterSeverity, filterRepo, searchQuery]);

  const handleApprove = async (reportId) => {
    try {
      setActionLoading(true);
      await axios.post(`/api/reports/${reportId}/approve`, {}, getAuthHeaders());
      await fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve report.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (report) => {
    const active = report.status === "PUBLISHED" && report.publishedVersion ? report.publishedVersion : report.output;
    setEditForm({
      title: active.title || "",
      summary: active.summary || "",
      suggestedDoc: active.suggestedDoc || "",
      intentDescription: active.intentDescription || "",
      changeSummary: active.changeSummary || "",
      notes: report.publishedVersion?.notes || "",
    });
    setShowEditModal(true);
  };

  const submitEditAndApprove = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/reports/${selectedReport._id}/edit-and-approve`, editForm, getAuthHeaders());
      setShowEditModal(false);
      await fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to edit and approve report.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!selectedReport || !rejectReason.trim()) {
      alert("A rejection reason is required.");
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(
        `/api/reports/${selectedReport._id}/reject`,
        { reason: rejectReason.trim() },
        getAuthHeaders()
      );
      setShowRejectModal(false);
      setRejectReason("");
      await fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject report.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async (reportId) => {
    try {
      setActionLoading(true);
      const res = await axios.post(`/api/reports/${reportId}/retry`, {}, getAuthHeaders());
      await fetchReports();
      if (res.data) setSelectedReport(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Retry failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportMarkdown = async (reportId) => {
    try {
      const res = await axios.get(`/api/reports/${reportId}/export`, {
        ...getAuthHeaders(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `whycode-report-${reportId}.md`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Failed to export report markdown.");
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await axios.post("/api/reports/generate", generateForm, getAuthHeaders());
      setShowGenerateModal(false);
      await fetchReports();
      if (res.data) setSelectedReport(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate report.");
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    const sev = (severity || "LOW").toUpperCase();
    if (sev === "CRITICAL") {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-500/10 text-red-400 border border-red-500/20">CRITICAL</span>;
    }
    if (sev === "HIGH") {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">HIGH</span>;
    }
    if (sev === "MEDIUM") {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">MEDIUM</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">LOW</span>;
  };

  const getStatusBadge = (status, isAiGenerated) => {
    if (status === "PUBLISHED") {
      return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Check className="w-3 h-3" /> Published</span>;
    }
    if (status === "REJECTED") {
      return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"><X className="w-3 h-3" /> Rejected</span>;
    }
    if (status === "FAILED") {
      return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><AlertTriangle className="w-3 h-3" /> Failed</span>;
    }
    return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"><Sparkles className="w-3 h-3" /> AI Draft</span>;
  };

  return (
    <div className="flex-1 min-h-screen bg-[#0d1117] text-gray-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#161b22] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-indigo-400" />
            Intelligence & Drift Reports
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Append-only documentation drift analysis, architectural intent reconstruction, and change summaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            Generate New Report
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#161b22]/50 border-b border-gray-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0d1117] border border-gray-700 text-xs rounded px-2.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="DRIFT">Documentation Drift</option>
            <option value="INTENT">Intent Reconstruction</option>
            <option value="CHANGE_SUMMARY">Change Summary</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0d1117] border border-gray-700 text-xs rounded px-2.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-[#0d1117] border border-gray-700 text-xs rounded px-2.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Repository Filter */}
          <select
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            className="bg-[#0d1117] border border-gray-700 text-xs rounded px-2.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Repositories</option>
            {repositories.map((r) => (
              <option key={r._id} value={r._id}>
                {r.fullName || r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search file, title, summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded pl-8 pr-3 py-1 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Content Area: Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Report List */}
        <div className="w-1/3 border-r border-gray-800 bg-[#161b22]/30 flex flex-col overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No reports matching the current filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {reports.map((rep) => {
                const isSelected = selectedReport?._id === rep._id;
                return (
                  <div
                    key={rep._id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-4 cursor-pointer transition border-l-2 ${
                      isSelected
                        ? "bg-[#1f242c] border-indigo-500 text-white"
                        : "hover:bg-[#1c2128] border-transparent text-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                          {rep.reportType}
                        </span>
                        {getSeverityBadge(rep.severity)}
                      </div>
                      {getStatusBadge(rep.status, rep.isAiGenerated)}
                    </div>
                    <div className="font-semibold text-xs truncate mt-1">
                      {rep.output?.title || rep.targetPath}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                      {rep.output?.summary || rep.targetPath}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2">
                      <span className="font-mono">{rep.targetPath}</span>
                      <span>{new Date(rep.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Report Inspection & Side-by-Side View */}
        <div className="flex-1 bg-[#0d1117] flex flex-col overflow-y-auto p-6">
          {selectedReport ? (
            <div className="space-y-6 max-w-5xl mx-auto w-full">
              {/* Report Header Card */}
              <div className="bg-[#161b22] border border-gray-800 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                        {selectedReport.reportType}
                      </span>
                      {getSeverityBadge(selectedReport.severity)}
                      {getStatusBadge(selectedReport.status, selectedReport.isAiGenerated)}
                      {selectedReport.requiresReview && selectedReport.status === "PENDING_REVIEW" && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Needs Human Review
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedReport.output?.title || `Report: ${selectedReport.targetPath}`}
                    </h2>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-4">
                      <span>Target: <code className="text-indigo-300 font-mono">{selectedReport.targetPath}</code></span>
                      <span>Confidence: <strong className="text-emerald-400">{Math.round((selectedReport.confidence || 0.85) * 100)}%</strong></span>
                      <span>Model: <code className="text-gray-300 font-mono">{selectedReport.model}</code></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportMarkdown(selectedReport._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 transition"
                      title="Download Markdown"
                    >
                      <Download className="w-3.5 h-3.5" /> Export MD
                    </button>

                    {selectedReport.status === "FAILED" && (
                      <button
                        onClick={() => handleRetry(selectedReport._id)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} /> Retry
                      </button>
                    )}

                    {isCompanyAdmin && selectedReport.status === "PENDING_REVIEW" && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(selectedReport)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600/80 hover:bg-blue-600 text-xs font-medium text-white transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit & Approve
                        </button>
                        <button
                          onClick={() => handleApprove(selectedReport._id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600/80 hover:bg-rose-600 text-xs font-medium text-white transition"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Published / Rejected Banner */}
                {selectedReport.status === "PUBLISHED" && (
                  <div className="mt-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                    <div>
                      <strong>Published & Verified Record:</strong> Approved on{" "}
                      {new Date(selectedReport.publishedVersion?.publishedAt).toLocaleString()}
                      {selectedReport.publishedVersion?.isCustomEdited && " (Custom reviewer edits preserved)"}
                    </div>
                    {selectedReport.publishedVersion?.notes && (
                      <div className="italic text-gray-400">"{selectedReport.publishedVersion.notes}"</div>
                    )}
                  </div>
                )}

                {selectedReport.status === "REJECTED" && (
                  <div className="mt-4 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                    <strong>Rejection Reason:</strong> {selectedReport.rejectionReason}
                  </div>
                )}
              </div>

              {/* Side-by-Side Code References vs Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Input References & Code Chunks */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    Input References & Chunks
                  </div>
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                    <div className="text-xs bg-[#0d1117] p-3 rounded border border-gray-800">
                      <span className="text-gray-400 block mb-1">Target Path:</span>
                      <code className="text-emerald-400 font-mono text-xs">{selectedReport.targetPath}</code>
                    </div>

                    {selectedReport.inputReferences?.lineRanges?.length > 0 && (
                      <div className="text-xs bg-[#0d1117] p-3 rounded border border-gray-800">
                        <span className="text-gray-400 block mb-1">Analyzed Line Ranges:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedReport.inputReferences.lineRanges.map((lr, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded font-mono text-[10px]">
                              L{lr.start}-L{lr.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedReport.inputReferences?.chunkIds?.length > 0 && (
                      <div className="text-xs bg-[#0d1117] p-3 rounded border border-gray-800">
                        <span className="text-gray-400 block mb-1">Retrieved Qdrant Chunk IDs:</span>
                        <ul className="list-disc list-inside text-gray-300 text-[11px] font-mono space-y-0.5">
                          {selectedReport.inputReferences.chunkIds.map((cid, idx) => (
                            <li key={idx} className="truncate">{cid}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedReport.output?.evidenceCommits?.length > 0 && (
                      <div className="text-xs bg-[#0d1117] p-3 rounded border border-gray-800">
                        <span className="text-gray-400 block mb-1 flex items-center gap-1">
                          <GitCommit className="w-3.5 h-3.5 text-indigo-400" /> Verified Evidence Commits:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedReport.output.evidenceCommits.map((sha, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[11px]">
                              {sha.slice(0, 7)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: AI Output / Documentation Analysis */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    {selectedReport.reportType === "DRIFT"
                      ? "Drift Analysis & Suggested Update"
                      : selectedReport.reportType === "INTENT"
                      ? "Reconstructed Intent"
                      : "Change Evolution"}
                  </div>

                  <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px]">
                    <div>
                      <span className="text-[11px] font-semibold text-gray-400 block mb-1">Executive Summary:</span>
                      <p className="text-xs text-gray-200 bg-[#0d1117] p-3 rounded border border-gray-800 leading-relaxed">
                        {selectedReport.status === "PUBLISHED" && selectedReport.publishedVersion?.summary
                          ? selectedReport.publishedVersion.summary
                          : selectedReport.output?.summary}
                      </p>
                    </div>

                    {selectedReport.reportType === "DRIFT" && selectedReport.output?.driftDetails && (
                      <div>
                        <span className="text-[11px] font-semibold text-amber-400 block mb-1">Identified Discrepancies:</span>
                        <div className="text-xs text-gray-200 bg-[#0d1117] p-3 rounded border border-amber-500/20 leading-relaxed">
                          {selectedReport.output.driftDetails}
                        </div>
                      </div>
                    )}

                    {selectedReport.output?.suggestedDoc && (
                      <div>
                        <span className="text-[11px] font-semibold text-emerald-400 block mb-1">Suggested Documentation:</span>
                        <pre className="text-xs text-gray-200 bg-[#0d1117] p-3 rounded border border-gray-800 font-mono whitespace-pre-wrap overflow-x-auto">
                          {selectedReport.status === "PUBLISHED" && selectedReport.publishedVersion?.suggestedDoc
                            ? selectedReport.publishedVersion.suggestedDoc
                            : selectedReport.output.suggestedDoc}
                        </pre>
                      </div>
                    )}

                    {selectedReport.reportType === "INTENT" && selectedReport.output?.intentDescription && (
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-400 block mb-1">Architectural Rationale:</span>
                        <div className="text-xs text-gray-200 bg-[#0d1117] p-3 rounded border border-gray-800 leading-relaxed">
                          {selectedReport.status === "PUBLISHED" && selectedReport.publishedVersion?.intentDescription
                            ? selectedReport.publishedVersion.intentDescription
                            : selectedReport.output.intentDescription}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
              <FileText className="w-12 h-12 stroke-[1] text-gray-600 mb-3" />
              <p className="text-sm">Select a report from the list to view its side-by-side evidence and analysis.</p>
            </div>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Generate Intelligence Report
            </h3>
            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Repository</label>
                <select
                  value={generateForm.repositoryId}
                  onChange={(e) => setGenerateForm({ ...generateForm, repositoryId: e.target.value })}
                  required
                  className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  {repositories.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.fullName || r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Report Type</label>
                <select
                  value={generateForm.reportType}
                  onChange={(e) => setGenerateForm({ ...generateForm, reportType: e.target.value })}
                  className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="DRIFT">Documentation Drift Detection</option>
                  <option value="INTENT">Architectural Intent Reconstruction</option>
                  <option value="CHANGE_SUMMARY">Change Summary Evolution</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Target File Path</label>
                <input
                  type="text"
                  value={generateForm.targetPath}
                  onChange={(e) => setGenerateForm({ ...generateForm, targetPath: e.target.value })}
                  required
                  placeholder="e.g. server/controllers/authController.js or README.md"
                  className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {generateForm.reportType === "INTENT" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Symbol / Function (Optional)</label>
                  <input
                    type="text"
                    value={generateForm.targetSymbol}
                    onChange={(e) => setGenerateForm({ ...generateForm, targetSymbol: e.target.value })}
                    placeholder="e.g. login or handleWebhook"
                    className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Run Analysis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit & Approve Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-lg p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-400" />
              Edit and Publish Report (Draft Output Preserved)
            </h3>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Summary</label>
              <textarea
                rows={3}
                value={editForm.summary}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200"
              />
            </div>
            {selectedReport?.reportType === "DRIFT" && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Suggested Documentation</label>
                <textarea
                  rows={4}
                  value={editForm.suggestedDoc}
                  onChange={(e) => setEditForm({ ...editForm, suggestedDoc: e.target.value })}
                  className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 font-mono text-gray-200"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Reviewer Notes (Optional)</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="e.g. Corrected method parameters before publishing."
                className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitEditAndApprove}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Publish Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              Reject Report
            </h3>
            <p className="text-xs text-gray-400">
              Please provide a reason for rejecting this AI-generated draft report.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. False positive: docstring aligns with latest PR specification."
                className="w-full bg-[#0d1117] border border-gray-700 text-xs rounded p-2 text-gray-200"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
