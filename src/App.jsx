import { useState } from "react";

export default function App() {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const exercises = [
    {
      vietnamese: "Tôi rất vui vì bạn đã đến.",
      english: "I'm very happy that you came.",
    },
    {
      vietnamese: "Dù trời mưa, chúng tôi vẫn đi dã ngoại.",
      english: "Although it rained, we still went on a picnic.",
    },
    {
      vietnamese: "Vì bận nên tôi không thể gọi cho bạn hôm nay.",
      english: "Because I was busy, I couldn't call you today.",
    },
    {
      vietnamese: "Mặc dù mệt, anh ấy vẫn tiếp tục làm việc.",
      english: "Although he was tired, he continued working.",
    },
    {
      vietnamese: "Nếu bạn cố gắng hơn, bạn sẽ thành công.",
      english: "If you try harder, you will succeed.",
    },
  ];

  const currentExercise = exercises[level - 1];

  const handleCheck = () => {
    const answer = input.trim();
    const correctAnswer = currentExercise.english;

    if (answer.toLowerCase() === correctAnswer.toLowerCase()) {
      setIsCorrect(true);
      setFeedback("✅ Correct! Great job!");
      setScore(score + 10);
      setStreak(streak + 1);
      if (streak % 3 === 2) {
        setShowAchievement(true);
        setTimeout(() => setShowAchievement(false), 3000);
      }
    } else {
      setIsCorrect(false);
      setFeedback(
        `❌ Incorrect. Suggested correction: "${correctAnswer}"\n\nNote: Grammar check is simulated here. In a real app, this would use AI grammar checking like Grammarly or Google NLP.`
      );
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (level < exercises.length) {
      setLevel(level + 1);
      setInput("");
      setFeedback("");
      setIsCorrect(null);
    } else {
      alert("🎉 You've completed all levels!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 font-sans text-gray-800">
      {showAchievement && (
        <div className="fixed top-4 right-4 bg-yellow-400 text-black px-6 py-3 rounded shadow-lg animate-bounce z-50">
          🏆 Achievement Unlocked: 3 in a Row!
        </div>
      )}

      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-700">English Practice</h1>
        <p className="text-gray-600 mt-2">Practice translating Vietnamese to English and get instant feedback!</p>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <span>🎯 Level: {level}</span>
          <span>🏆 Score: {score}</span>
          <span>🔥 Streak: {streak}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Translate this sentence to English:
          </h2>
          <p className="text-gray-800 text-lg italic mb-2">{currentExercise.vietnamese}</p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your translation here..."
            className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setShowSample(!showSample)}
              className="text-sm text-indigo-600 hover:underline"
            >
              {showSample ? "Hide sample" : "Show sample"}
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleCheck}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
              >
                Check
              </button>
              {isCorrect !== null && (
                <button
                  onClick={handleNext}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {showSample && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded text-sm">
              <strong>Sample translation:</strong> "{currentExercise.english}"
            </div>
          )}

          {feedback && (
            <div
              className={`mt-4 p-3 rounded text-sm ${
                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {feedback}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-gray-500 text-sm mt-8">
        &copy; 2025 English Practice Tool. Built for self-learning.
      </footer>
    </div>
  );
}
