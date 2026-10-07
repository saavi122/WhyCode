import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Brain, FileCode2, MessageSquare } from "lucide-react";

export default function KnowledgeView({ data, isActive, onUserAction }) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const currentQA = data.suggestedQuestions[selectedQuestionIndex] || data.suggestedQuestions[0];

  // Animation states
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [isTypingQuestion, setIsTypingQuestion] = useState(false);
  const [isTypingAnswer, setIsTypingAnswer] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const timersRef = useRef([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    clearAllTimers();

    if (!isActive) {
      setDisplayedQuestion(currentQA.question);
      setDisplayedAnswer(currentQA.answer);
      setShowCitations(true);
      return;
    }

    // Reset for animated streaming
    setDisplayedQuestion("");
    setDisplayedAnswer("");
    setShowCitations(false);
    setIsTypingQuestion(true);
    setIsTypingAnswer(false);

    const questionText = currentQA.question;
    const answerText = currentQA.answer;

    // 1. Stream Question (fast)
    let qIdx = 0;
    const qInterval = setInterval(() => {
      qIdx += 2;
      if (qIdx >= questionText.length) {
        setDisplayedQuestion(questionText);
        clearInterval(qInterval);
        setIsTypingQuestion(false);

        // 2. Short pause then stream answer
        const t1 = setTimeout(() => {
          setIsTypingAnswer(true);
          let aIdx = 0;
          const aInterval = setInterval(() => {
            aIdx += 4;
            if (aIdx >= answerText.length) {
              setDisplayedAnswer(answerText);
              clearInterval(aInterval);
              setIsTypingAnswer(false);

              // 3. Fade in citations
              const t2 = setTimeout(() => {
                setShowCitations(true);
              }, 200);
              timersRef.current.push(t2);
            } else {
              setDisplayedAnswer(answerText.slice(0, aIdx));
            }
          }, 15);
        }, 150);
        timersRef.current.push(t1);
      } else {
        setDisplayedQuestion(questionText.slice(0, qIdx));
      }
    }, 12);

    return () => {
      clearInterval(qInterval);
      clearAllTimers();
    };
  }, [isActive, selectedQuestionIndex]);

  const handleSelectQuestion = (idx) => {
    if (selectedQuestionIndex === idx) return;
    setSelectedQuestionIndex(idx);
    if (onUserAction) onUserAction();
  };

  return (
    <div className="preview-view-container knowledge-view">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-left">
          <h3 className="view-headline">{data.title}</h3>
          <span className="view-model-badge">
            <Sparkles size={12} className="text-cyan" />
            <span>{data.modelBadge}</span>
          </span>
        </div>
      </div>

      {/* Suggested Questions Pills */}
      <div className="suggested-questions-row" role="tablist" aria-label="Suggested questions">
        {data.suggestedQuestions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => handleSelectQuestion(idx)}
            className={`suggested-q-pill ${selectedQuestionIndex === idx ? "active" : ""}`}
            role="tab"
            aria-selected={selectedQuestionIndex === idx}
          >
            <MessageSquare size={12} className="pill-q-icon" />
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Main Visual: Interactive Chat Console */}
      <div className="knowledge-chat-box">
        {/* User Question Bubble */}
        <div className="qa-bubble-q">
          <span className="qa-bubble-badge-q">Q</span>
          <div className="qa-bubble-text-wrap">
            <p className="qa-q-text">
              “{displayedQuestion}”
              {isTypingQuestion && <span className="typing-cursor">|</span>}
            </p>
          </div>
        </div>

        {/* AI Answer Bubble */}
        <div className="qa-bubble-a">
          <div className="qa-bubble-badge-a">
            <Brain size={15} />
          </div>
          <div className="qa-bubble-a-body">
            <p className="qa-a-text">
              “{displayedAnswer}”
              {isTypingAnswer && <span className="typing-cursor">|</span>}
            </p>

            {/* Evidence Chips */}
            <div className={`qa-citations-container ${showCitations ? "visible" : ""}`}>
              <span className="citations-label">{currentQA.evidenceNote}:</span>
              <div className="citations-chips-list">
                {currentQA.citations.map((c, i) => (
                  <div key={i} className="citation-chip">
                    <FileCode2 size={12} className="text-cyan" />
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
