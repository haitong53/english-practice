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
    // State và các biến
  const [notes, setNotes] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [currentTab, setCurrentTab] = useState("từ vựng");
  const [searchTerm, setSearchTerm] = useState("");
  const [types] = useState(["từ vựng", "ngữ pháp", "thành ngữ"]);
  const [editingNote, setEditingNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState("");
  const [exampleOrExplanation, setExampleOrExplanation] = useState("");
  const [translateInput, setTranslateInput] = useState("");
  const [translateResult, setTranslateResult] = useState("");


  // Hàm gọi Google Translate API (giả lập)
  const handleTranslate = async (sourceLang, targetLang) => {
    if (!translateInput.trim()) return;
  
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(translateInput)}&langpair=${sourceLang}|${targetLang}`
      );
      const data = await response.json();
      setTranslateResult(data.responseData.translatedText || "Không thể dịch");
    } catch (error) {
      setTranslateResult("Lỗi khi dịch. Vui lòng thử lại.");
    }
  };
  
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

  // Hàm export file TXT
  const handleExportTXT = () => {
    const content = notes
      .map((note) => `${note.word} | ${note.meaning} | ${note.type}`)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "english-notes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Hàm export file JSON
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "english-notes.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  //Hàm sắp xếp từ vựng A-Z
  const handleSortAZ = () => {
    const sortedNotes = [...notes]
      .filter((note) => note.type === currentTab)
      .sort((a, b) =>
        a.word.toLowerCase().localeCompare(b.word.toLowerCase())
      );
  
    const otherNotes = notes.filter((note) => note.type !== currentTab);
    const reorderedNotes = [...sortedNotes, ...otherNotes];
  
    setNotes(reorderedNotes);
    saveNotesToLocalStorage(reorderedNotes);
    alert(`✅ Đã sắp xếp "${currentTab}" theo thứ tự A-Z`);
};

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
        exampleOrExplanation: exampleOrExplanation.trim(), // Lưu ví dụ/giải thích
        addedDate: new Date().toISOString(),
      },
    ];
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
    
    // ✅ THÊM THÔNG BÁO SAU KHI LƯU
    setNotification(`Từ "${newWord}" đã được thêm vào Note`);
    setTimeout(() => setNotification(""), 3000); // Ẩn sau 3 giây
    
    setNewWord("");
    setNewMeaning("");
    setExampleOrExplanation(""); // Reset trường mới
  };

  // Hàm xóa một note
  const handleDeleteNote = (id) => {
    const noteToDelete = notes.find(note => note.id === id);
    if (!noteToDelete) {
      Swal.fire("Lỗi", "Không tìm thấy từ để xóa!", "error");
      return;
    }
  
    Swal.fire({
      title: "Xác nhận xóa",
      text: `Bạn có chắc chắn muốn xóa từ "${noteToDelete.word}" không?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Có, xóa!",
      cancelButtonText: "Không, giữ lại"
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedNotes = notes.filter((note) => note.id !== id);
        setNotes(updatedNotes);
        saveNotesToLocalStorage(updatedNotes);
        Swal.fire("Đã xóa!", `Từ "${noteToDelete.word}" đã được xóa.`, "success");
      }
    });
  };

  // Hàm chỉnh sửa note
  const handleEditNote = (note) => {
    setEditingNote({ ...note });
    setIsEditing(true);

     //TỰ ĐỘNG CUỘN LÊN ĐẦU TRANG
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
  };

  // Hàm lưu thay đổi khi chỉnh sửa
  const handleSaveEdit = () => {
    if (!editingNote) return;

    const updatedNotes = notes.map((note) =>
      note.id === editingNote.id ? editingNote : note
    );
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);

    //THÊM THÔNG BÁO SAU KHI CẬP NHẬT
    setNotification(`Từ "${editingNote.word}" đã được cập nhật thành công`);
    setTimeout(() => setNotification(""), 3000);

    // Đặt lại trạng thái sau khi lưu
    setEditingNote(null);
    setIsEditing(false);
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

  // Hàm phát âm từ tiếng Anh
  const speakText = (text) => {
    if (!text) return;
  
    // Kiểm tra trình duyệt có hỗ trợ SpeechSynthesis không
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // Giọng Mỹ
      utterance.rate = 1; // Tốc độ phát âm (0.1 - 10)
      utterance.pitch = 1; // Cao độ (0 - 2)
      utterance.volume = 1; // Âm lượng (0 - 1)
  
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Trình duyệt của bạn không hỗ trợ phát âm.");
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 font-sans text-gray-800">
    <div className="max-w-md mx-auto">
     {/* header */}
    <header className="text-center mb-8">
      <h1 className="text-4xl font-bold text-indigo-700">Ghi Chú Tiếng Anh</h1>
      <p className="text-gray-600 mt-2">Ghi chú từ vựng, ngữ pháp, thành ngữ...</p>
    </header>

    {/* Tabs */}
    <nav className="mb-4">
      <ul className="flex space-x-4 justify-center">
        {types.map((type) => (
          <li key={type}>
            <button
              onClick={() => setCurrentTab(type)}
              className={`px-4 py-2 rounded-md ${
                currentTab === type
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          </li>
        ))}
      </ul>
    </nav>

    {/* 🟦 GOOGLE DỊCH - LUÔN HIỂN THỊ */}
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Google Dịch</h2>
      
      <textarea
        value={translateInput}
        onChange={(e) => setTranslateInput(e.target.value)}
        placeholder="Nhập từ hoặc câu cần dịch..."
        className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
  
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => handleTranslate("en", "vi")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
        >
          EN → VN
        </button>
        <button
          onClick={() => handleTranslate("vi", "en")}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
        >
          VN → EN
        </button>
      </div>
  
      {translateResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <p className="font-medium">Kết quả:</p>
          <button
            onClick={() => speakText(translateResult)}
            className="text-indigo-600 hover:text-indigo-800"
            title="Phát âm"
          >
            🔊
          </button>
          <p className="mt-1">{translateResult}</p>
        </div>
      )}
    </div>

    {/* Ô tìm kiếm */}
    <div className="max-w-2xl mx-auto mb-6">
      <input
        type="text"
        placeholder="Tìm kiếm trong ghi chú..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>

    {/* Thông báo */}
    {notification && (
      <div className="max-w-2xl mx-auto mb-4 p-3 bg-green-100 text-green-800 text-sm rounded-md text-center">
        {notification}
      </div>
    )}

        {/* Form nhập ghi chú mới */}
            <div className="mb-6">
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Nhập từ tiếng Anh..."
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="Nhập nghĩa tiếng Việt..."
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="Nhập ví dụ hoặc giải thích thêm (tùy chọn)..."
                  value={exampleOrExplanation}
                  onChange={(e) => setExampleOrExplanation(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>
              <button
                onClick={handleAddNote}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition text-sm"
              >
                Lưu
              </button>
            </div>
            <button
              onClick={handleSaveEdit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
            >
              Lưu
            </button>
          </div>
        ) : (

         // form thêm mới 
          <div>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Nhập từ tiếng Anh..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="mb-4">
              <textarea
                placeholder="Nhập nghĩa tiếng Việt..."
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {/* ✅ THÊM TRƯỜNG INPUT MỚI ĐÂY */}
            <div className="mb-4">
                <textarea
                  placeholder="Nhập ví dụ hoặc giải thích thêm (tùy chọn)..."
                  value={exampleOrExplanation}
                  onChange={(e) => setExampleOrExplanation(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            <button
              onClick={handleAddNote}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
            >
              Lưu
            </button>
          </div>
        )}
      </div>

    {/* Nút Import/Export */}
    <div className="mb-6 flex flex-wrap gap-2 justify-between">
      <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded cursor-pointer text-sm">
        Import từ file
        <input
          type="file"
          accept=".txt,.json"
          className="hidden"
          onChange={handleImportFile}
        />
      </label>
    
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExportTXT}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Export .txt
        </button>
        <button
          onClick={handleExportJSON}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
        >
          Export .json
        </button>
      </div>
    </div>

    {/* Nút Xóa tất cả */}
    <div className="mb-6 flex justify-end">
      <button
        onClick={handleDeleteAllNotes}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition text-sm"
      >
        🗑️ Xóa tất cả
      </button>
    </div>

    {/* Nút Sắp xếp */}
    <div className="mb-6 flex justify-end">
      <button
        onClick={handleSortAZ}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
      >
        🔤 Sắp xếp A-Z
      </button>
    </div>

   {/* Danh sách ghi chú */}
    <main className="bg-white rounded-xl shadow-md overflow-hidden p-6">
        <ul className="space-y-3">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <li
                key={note.id}
                className="flex justify-between items-start bg-gray-50 p-3 rounded-md transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-[1.02]"
              >
                {/* Cột trái: Từ + Nghĩa + Giải thích */}
                <div className="flex-1 pr-4">
                  <span>{highlightKeyword(`${note.word}: ${note.meaning}`, searchTerm)}</span>
                  {note.exampleOrExplanation && (
                    <p className="text-sm italic text-blue-500 mt-1 mb-0">
                      {note.exampleOrExplanation}
                    </p>
                  )}
                </div>
      
                {/* Cột phải: Nút Sửa / Xóa / Phát âm */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => speakText(note.word)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                    title="Phát âm"
                  >
                    🔊
                  </button>
                  <button
                    onClick={() => handleEditNote(note)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-sm text-red-600 hover:text-red-800 hover:underline transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="text-gray-500 italic text-center py-4">
              Không có ghi chú nào.
            </li>
          )}
        </ul>
      </main>
      </div>
        

      <footer className="text-center text-gray-500 text-sm mt-8">
        &copy; This is a vocabulary app for learning English.
      </footer>
    </div>
  );
}
