import KnowledgeQA from "../models/KnowledgeQA.js";
import CommitMemory from "../models/CommitMemory.js";
import * as aiService from "../services/aiService.js";

export const askQuestion = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    // Build regex query from words longer than 2 characters
    const queryWords = question
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
      .filter((w) => w.length > 2);

    let relevantCommits = [];
    if (queryWords.length > 0) {
      relevantCommits = await CommitMemory.find({
        repository: repoId,
        $or: [
          { message: { $regex: queryWords.join("|"), $options: "i" } },
          { author: { $regex: queryWords.join("|"), $options: "i" } },
        ],
      }).limit(15);
    }

    // Fallback if no matching commits found
    if (relevantCommits.length === 0) {
      relevantCommits = await CommitMemory.find({ repository: repoId })
        .sort({ date: -1 })
        .limit(10);
    }

    const result = await aiService.answerKnowledgeQuestion(question, relevantCommits);

    const saved = await KnowledgeQA.create({
      repository: repoId,
      askedBy: req.user._id,
      question,
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
    });

    res.json(saved);
  } catch (err) {
    next(err);
  }
};
