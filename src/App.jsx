import { useState, useEffect } from "react";

// Hàm loại bỏ dấu tiếng Việt
const removeVietnameseTones = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

export default function App() {
  // Hàm import file
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.type === "application/json" || file.name.endsWith(".json")) {
      reader.onload = (event) => {
        try {
          const importedNotes = JSON.parse(event.target.result);
          const mergedNotes = [...notes, ...importedNotes];
          setNotes(mergedNotes);
          saveNotesToLocalStorage(mergedNotes);
          alert("Đã nhập dữ liệu từ file JSON thành công!");
        } catch (error) {
          alert("Lỗi: File JSON không hợp lệ.");
        }
      };
      reader.readAsText(file);
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      reader.onload = (event) => {
        const lines = event.target.result.split("\n").filter(Boolean);
        const importedNotes = [];

        lines.forEach((line) => {
          line = line.trim();
          if (line.includes("=")) {
            const [word, meaning] = line.split("=");
            importedNotes.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              word: word.trim(),
              meaning: meaning.trim(),
              type: currentTab,
              addedDate: new Date().toISOString(),
            });
          }
        });

        const mergedNotes = [...notes, ...importedNotes];
        setNotes(mergedNotes);
        saveNotesToLocalStorage(mergedNotes);
        alert(`Đã nhập ${importedNotes.length} từ thành công!`);
      };
      reader.readAsText(file);
    } else {
      alert("Chỉ hỗ trợ file .txt hoặc .json");
    }
  };

  // State và các biến
  const [notes, setNotes] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [currentTab, setCurrentTab] = useState("từ vựng");
  const [searchTerm, setSearchTerm] = useState("");
  const [types] = useState(["từ vựng", "ngữ pháp", "thành ngữ"]);

  // Load notes từ localStorage khi mở app
  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem("english-notes")) || [];
    setNotes(savedNotes);
  }, []);

  // Hàm lưu ghi chú vào localStorage
  const saveNotesToLocalStorage = (updatedNotes) => {
    localStorage.setItem("english-notes", JSON.stringify(updatedNotes));
  };

  // Hàm thêm ghi chú mới
  const handleAddNote = () => {
    if (!newWord.trim() || !newMeaning.trim()) return;
    const newId = Date.now().toString();
    const updatedNotes = [
      ...notes,
      {
        id: newId,
        type: currentTab,
        word: newWord,
        meaning: newMeaning,
        addedDate: new Date().toISOString(),
      },
    ];
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
    setNewWord("");
    setNewMeaning("");
  };

  // Hàm xóa một note
  const handleDeleteNote = (id) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
  };

  // Hàm xóa tất cả note
  const handleDeleteAllNotes = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả ghi chú?")) {
      setNotes([]);
      saveNotesToLocalStorage([]);
      alert("Đã xóa toàn bộ ghi chú!");
    }
  };

  // Lọc theo tab và từ khóa tìm kiếm (không dấu)
  const filteredNotes = notes
    .filter((note) => note.type === currentTab)
    .filter((note) => {
      const noteContent = `${note.word} ${note.meaning}`.toLowerCase();
      const keyword = removeVietnameseTones(searchTerm).toLowerCase();
      const normalizedNote = removeVietnameseTones(noteContent).toLowerCase();
      return normalizedNote.includes(keyword);
    });

  // Hàm highlight từ khóa
  const highlightKeyword = (text, keyword) => {
    if (!keyword) return text;

    const normalizedKeyword = removeVietnameseTones(keyword).toLowerCase();
    const normalizedText = removeVietnameseTones(text).toLowerCase();
    const originalText = text;

    const regex = new RegExp(`(${normalizedKeyword})`, "gi");
    const parts = originalText.split(regex);

    return parts.map((part, index) => {
      if (removeVietnameseTones(part).toLowerCase().includes(normalizedKeyword)) {
        return (
          <mark key={index} className="bg-yellow-300">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 font-sans text-gray-800">
      {/* ... */}
    </div>
  );
}
