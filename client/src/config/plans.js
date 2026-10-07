// Centralized WhyCode Plans Configuration

export const WHYCODE_PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    formattedPrice: "$0",
    period: "/month",
    description: "Essential code intelligence for individuals and personal projects.",
    target: "Individuals and very small teams",
    members: "Up to 3 members",
    repositories: "Up to 2 repos",
    popular: false,
    features: [
      "Basic repository AST indexing",
      "Codebase semantic search",
      "AI code explanations",
      "Basic documentation view",
      "Community support resources"
    ]
  },
  startup: {
    id: "startup",
    name: "Startup",
    price: 10,
    formattedPrice: "$10",
    period: "/month",
    description: "Core repository intelligence for small growing startup teams.",
    target: "Small startup engineering teams",
    members: "Up to 10 members",
    repositories: "Multiple repos",
    popular: false,
    features: [
      "GitHub OAuth integration",
      "AI knowledge assistant & chat",
      "Documentation drift detection",
      "Commit memory tracking",
      "Developer activity insights"
    ]
  },
  team: {
    id: "team",
    name: "Team",
    price: 40,
    formattedPrice: "$40",
    period: "/month",
    description: "Advanced intelligence & collaboration for scaling engineering teams.",
    target: "Teams with 25–50 developers",
    members: "25–50 members",
    repositories: "Expanded repos",
    popular: true,
    features: [
      "Full deep repository indexing",
      "Real-time drift detection & alerts",
      "Developer management & dashboards",
      "Team & repository analytics",
      "Priority support & increased quotas"
    ]
  },
  custom: {
    id: "custom",
    name: "Custom",
    price: 0,
    formattedPrice: "Custom",
    period: "",
    description: "Enterprise-grade scale, security, and dedicated controls.",
    target: "Large organizations and enterprise teams",
    members: "Unlimited members",
    repositories: "Unlimited repos",
    popular: false,
    features: [
      "Enterprise RAG knowledge engine",
      "Organization workspaces & RBAC",
      "Custom AI models & VPC deployment",
      "Advanced security & SOC2 compliance",
      "Dedicated SLA & Technical Account Manager"
    ]
  }
};

export const getPlanById = (planId) => {
  const normalized = (planId || "team").toLowerCase();
  return WHYCODE_PLANS[normalized] || WHYCODE_PLANS.team;
};
