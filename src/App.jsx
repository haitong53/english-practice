import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase"; // Đường dẫn đến firebase.js
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase"; // Đảm bảo firebase.js export storage
import { collection, addDoc, writeBatch } from "firebase/firestore";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
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
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const reader = new FileReader();
  
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        reader.onload = async (event) => {
          try {
            const importedNotes = JSON.parse(event.target.result);
            const notesRef = collection(db, "notes");
            const batch = writeBatch(db);
  
            importedNotes.forEach((note) => {
              const newDocRef = doc(notesRef);
              batch.set(newDocRef, {
                ...note,
                addedDate: new Date().toISOString(),
                userId: user?.uid // Nếu dùng auth
              });
            });
  
            await batch.commit();
            setNotification("Đã nhập dữ liệu từ file JSON thành công!");
            setTimeout(() => setNotification(""), 3000);
          } catch (error) {
            setNotification("Lỗi: File JSON không hợp lệ.");
            setTimeout(() => setNotification(""), 3000);
          }
        };
        reader.readAsText(file);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        reader.onload = async (event) => {
          const lines = event.target.result.split("\n").filter(Boolean);
          const importedNotes = [];
  
          lines.forEach((line) => {
            line = line.trim();
            if (line.includes("|")) {
              const [word, meaning, type] = line.split("|").map(s => s.trim());
              importedNotes.push({
                word,
                meaning,
                type: type || currentTab,
                addedDate: new Date().toISOString(),
                userId: user?.uid // Nếu dùng auth
              });
            }
          });
  
          const notesRef = collection(db, "notes");
          const batch = writeBatch(db);
  
          importedNotes.forEach((note) => {
            const newDocRef = doc(notesRef);
            batch.set(newDocRef, note);
          });
  
          await batch.commit();
          setNotification(`Đã nhập ${importedNotes.length} từ thành công!`);
          setTimeout(() => setNotification(""), 3000);
        };
        reader.readAsText(file);
      } else {
        setNotification("Chỉ hỗ trợ file .txt hoặc .json");
        setTimeout(() => setNotification(""), 3000);
      }
    } catch (error) {
      console.error("Error importing file:", error);
      setNotification("Lỗi khi nhập file!");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm export file
  const handleExportFile = async (format) => {
    try {
      // Chuẩn bị nội dung file
      const content = format === "json"
        ? JSON.stringify(notes, null, 2)
        : notes.map((note) => `${note.word} | ${note.meaning} | ${note.type}`).join("\n");
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/plain" });
      const fileName = `english-notes-${new Date().toISOString()}.${format}`;
      const storageRef = ref(storage, `exports/${fileName}`);
  
      // Upload lên Firebase Storage
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
  
      // Tạo link để tải về
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      setNotification(`Đã export thành công dưới dạng ${format.toUpperCase()}!`);
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error exporting file:", error);
      setNotification("Lỗi khi export file!");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  //Hàm sắp xếp từ vựng A-Z
  const handleSortAZ = async () => {
    try {
      const notesRef = collection(db, "notes");
      const querySnapshot = await getDocs(notesRef);
      const allNotes = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  
      // Lọc và sắp xếp theo currentTab
      const sortedNotes = allNotes
        .filter((note) => note.type === currentTab)
        .sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
  
      // Giữ các note khác không thuộc currentTab
      const otherNotes = allNotes.filter((note) => note.type !== currentTab);
  
      // Cập nhật lại Firestore với thứ tự mới
      const updatePromises = sortedNotes.map((note) =>
        updateDoc(doc(db, "notes", note.id), note)
      );
      await Promise.all(updatePromises); // Đảm bảo tất cả cập nhật hoàn thành
  
      setNotification(`✅ Đã sắp xếp "${currentTab}" theo thứ tự A-Z`);
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error sorting notes:", error);
      setNotification("Lỗi khi sắp xếp ghi chú!");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Load notes từ firebase khi mở app
  useEffect(() => {
      const notesRef = collection(db, "notes"); // Collection tên 'notes'
    
      // Real-time listener
      const unsubscribe = onSnapshot(notesRef, (snapshot) => {
        const loadedNotes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setNotes(loadedNotes);
      });
    
      return unsubscribe; // Cleanup
    }, [user]);

  
  // Hàm thêm ghi chú mới
  const handleAddNote = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;
  
    try {
      const notesRef = collection(db, "notes");
      await addDoc(notesRef, {
        type: currentTab,
        word: newWord,
        meaning: newMeaning,
        exampleOrExplanation: exampleOrExplanation.trim(),
        addedDate: new Date().toISOString(),
      });
      setNotification(`Từ "${newWord}" đã được thêm`);
      setTimeout(() => setNotification(""), 3000);
      setNewWord("");
      setNewMeaning("");
      setExampleOrExplanation("");
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  // Hàm xóa một note
  const handleDeleteNote = async (id) => {
    try {
      const noteRef = doc(db, "notes", id);
      await deleteDoc(noteRef);
      setNotification("Đã xóa từ thành công!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };
  

  // Hàm chỉnh sửa note
  const handleSaveEdit = async () => {
    if (!editingNote) return;
  
    try {
      const noteRef = doc(db, "notes", editingNote.id);
      await updateDoc(noteRef, {
        word: editingNote.word,
        meaning: editingNote.meaning,
        exampleOrExplanation: editingNote.exampleOrExplanation,
        type: editingNote.type, // Nếu cần cập nhật type
        addedDate: editingNote.addedDate, // Giữ nguyên hoặc cập nhật nếu cần
      });
  
      setNotification(`Từ "${editingNote.word}" đã được cập nhật thành công`);
      setTimeout(() => setNotification(""), 3000);
  
      // Đặt lại trạng thái sau khi lưu
      setEditingNote(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating note:", error);
      setNotification("Lỗi khi cập nhật ghi chú!");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm lưu thay đổi khi chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editingNote) return;
  
    try {
      const noteRef = doc(db, "notes", editingNote.id);
      await updateDoc(noteRef, editingNote);
      setNotification(`Từ "${editingNote.word}" đã được cập nhật`);
      setTimeout(() => setNotification(""), 3000);
      setEditingNote(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  // Hàm xóa tất cả note
  const handleDeleteAllNotes = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tất cả ghi chú?")) return;
  
    try {
      const notesRef = collection(db, "notes");
      const querySnapshot = await getDocs(notesRef);
  
      querySnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(doc(db, "notes", docSnapshot.id));
      });
  
      setNotification("Đã xóa toàn bộ ghi chú!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error deleting all notes:", error);
      setNotification("Lỗi khi xóa tất cả ghi chú!");
      setTimeout(() => setNotification(""), 3000);
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
        {isEditing ? (
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
              onClick={handleSaveEdit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition text-sm"
            >
              Lưu
            </button>
          </div>
        ) : (
          <div className="mb-6">
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
          onClick={() => handleExportFile("txt")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Export .txt
        </button>
        <button
          onClick={() => handleExportFile("json")}
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

  {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa từ "{noteToDelete?.word}" không?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded transition text-sm"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  handleDeleteNote(noteToDelete.id);
                  setShowDeleteModal(false);
                  setNoteToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition text-sm"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
  
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
                        onClick={() => {
                          setNoteToDelete(note); // Lưu ghi chú cần xóa
                          setShowDeleteModal(true); // Hiển thị modal
                          console.log("showDeleteModal:", true); // Kiểm tra
                        }}
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
