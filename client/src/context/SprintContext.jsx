import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const SprintContext = createContext(null);

export const SprintProvider = ({ children }) => {
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [telemetry, setTelemetry] = useState({
    cpu: 24,
    memory: 42,
    network: 120,
    coverage: 84.5,
    commitsCount: 0,
    activeAlerts: 0,
  });

  // Simulated live metrics ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpu: Math.max(10, Math.min(95, prev.cpu + Math.floor(Math.random() * 11) - 5)),
        memory: Math.max(30, Math.min(85, prev.memory + Math.floor(Math.random() * 5) - 2)),
        network: Math.max(50, Math.min(400, prev.network + Math.floor(Math.random() * 31) - 15)),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch selected repo details when selectedRepoId changes
  useEffect(() => {
    if (!selectedRepoId) {
      setSelectedRepo(null);
      return;
    }
    const fetchRepo = async () => {
      try {
        const res = await API.get(`/repositories/${selectedRepoId}`);
        setSelectedRepo(res.data);
      } catch (err) {
        console.error("Failed to fetch repository details:", err);
      }
    };
    fetchRepo();
  }, [selectedRepoId]);

  // Teammates database (AI simulation teammates)
  const [teammates, setTeammates] = useState([
    {
      id: "asha",
      name: "Asha",
      role: "Code Quality Architect",
      status: "online",
      avatar: "✨",
      skills: { codeQuality: 98, testing: 85, architecture: 90, communication: 92, velocity: 88 },
      bio: "Focuses on static analysis, refactoring, and linting patterns. Helps you write clean, maintainable, and readable code.",
      greeting: "Hello, I am Asha. I monitor static analysis patterns, code duplication, and code readability. Let's refactor!"
    },
    {
      id: "ravi",
      name: "Ravi",
      role: "Test Engineer Specialist",
      status: "online",
      avatar: "🧪",
      skills: { codeQuality: 82, testing: 99, architecture: 85, communication: 88, velocity: 90 },
      bio: "Specializes in automated unit testing, end-to-end testing, coverage reporting, and test mocking strategies.",
      greeting: "Hi, Ravi here. I analyze test coverage and generate assertions. Let me know which module we need to test!"
    },
    {
      id: "mira",
      name: "Mira",
      role: "System Designer",
      status: "online",
      avatar: "⚙️",
      skills: { codeQuality: 92, testing: 80, architecture: 98, communication: 94, velocity: 84 },
      bio: "Focuses on microservice design, DB schema normalization, and overall architectural drift prevention.",
      greeting: "Greetings, user. I check design documents, architectural diagrams, and schema drift. How can I assist in structuring WhyCode?"
    },
    {
      id: "kenji",
      name: "Kenji",
      role: "Security Sentinel",
      status: "online",
      avatar: "🛡️",
      skills: { codeQuality: 88, testing: 88, architecture: 92, communication: 80, velocity: 94 },
      bio: "Scans for vulnerabilities, secrets leakage, dependency CVEs, and authorization flaws.",
      greeting: "Kenji online. Performing real-time dependency audits and credential leak scans. Ask me to audit any file."
    },
    {
      id: "leah",
      name: "Leah",
      role: "DevOps Orchestrator",
      status: "online",
      avatar: "🚀",
      skills: { codeQuality: 80, testing: 90, architecture: 90, communication: 86, velocity: 98 },
      bio: "Monitors build pipelines, deployment configurations, Kubernetes configurations, and containerization performance.",
      greeting: "Hey! Leah here. I help optimize container builds and deployment pipelines. Ready to ship to production?"
    }
  ]);

  // Chat message store per teammate
  const [chatThreads, setChatThreads] = useState({
    asha: [{ sender: "ai", text: "Hello! I am Asha, your Code Quality teammate. Ask me any question about the codebase." }],
    ravi: [{ sender: "ai", text: "Hello! I am Ravi. I am here to help you design tests and check test coverage." }],
    mira: [{ sender: "ai", text: "Greetings. I am Mira, your System Designer teammate. Let's prevent design drift." }],
    kenji: [{ sender: "ai", text: "Hello. I am Kenji. Let's make sure our codebase is fully secure." }],
    leah: [{ sender: "ai", text: "Hi! I am Leah. Let's build, compile, and deploy our features." }]
  });

  const sendMessageToTeammate = async (teammateId, text) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg = { sender: "user", text };
    setChatThreads((prev) => ({
      ...prev,
      [teammateId]: [...(prev[teammateId] || []), userMsg]
    }));

    // Perform call to the actual backend API if repository is selected
    try {
      let aiResponseText = "";
      if (selectedRepoId) {
        // Query the actual askQuestion controller
        const res = await API.post(`/chat/${selectedRepoId}`, { question: text });
        aiResponseText = res.data.answer;
      } else {
        // Fallback simulated response based on teammate role
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const teammate = teammates.find((t) => t.id === teammateId);
        aiResponseText = `[Simulated ${teammate.name}]: I noticed no repository is currently selected. Please select a repository from the dashboard to query actual codebase context. Under the ${teammate.role} scope, I recommend structuring your engineering goals clearly!`;
      }

      const aiMsg = { sender: "ai", text: aiResponseText };
      setChatThreads((prev) => ({
        ...prev,
        [teammateId]: [...(prev[teammateId] || []), aiMsg]
      }));
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = { sender: "ai", text: "Sorry, I encountered an error fetching response from the backend. Please check your connection." };
      setChatThreads((prev) => ({
        ...prev,
        [teammateId]: [...(prev[teammateId] || []), errorMsg]
      }));
    }
  };

  return (
    <SprintContext.Provider
      value={{
        selectedRepoId,
        setSelectedRepoId,
        selectedRepo,
        telemetry,
        teammates,
        chatThreads,
        sendMessageToTeammate,
      }}
    >
      {children}
    </SprintContext.Provider>
  );
};

export const useSprint = () => {
  const context = useContext(SprintContext);
  if (!context) {
    throw new Error("useSprint must be used within a SprintProvider");
  }
  return context;
};
