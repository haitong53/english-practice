import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  writeBatch,
  onSnapshot,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Đường dẫn đến file firebase.js, chỉ cần db và storage

// Hàm loại bỏ dấu tiếng Việt
const removeVietnameseTones = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

// Hàm phát âm từ
const speakText = (text) => {
  if (!text || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
};

export default function App() {
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
  const [structure, setStructure] = useState(""); // Field mới cho công thức ngữ pháp
  const [examples, setExamples] = useState(""); // Field mới cho ví dụ câu
  const [translateInput, setTranslateInput] = useState("");
  const [translateResult, setTranslateResult] = useState("");

  // Load notes khi mount
  useEffect(() => {
    const notesRef = collection(db, "test");
    const unsubscribe = onSnapshot(notesRef, (snapshot) => {
      const loadedNotes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotes(loadedNotes);
    });

    return unsubscribe;
  }, []);

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

  // Hàm thêm ghi chú mới
  const handleAddNote = async () => {
    if ((!newWord.trim() && currentTab !== "ngữ pháp") || !newMeaning.trim()) return;

    try {
      const notesRef = collection(db, "test");
      const noteData = {
        type: currentTab,
        addedDate: new Date().toISOString(),
      };

      if (currentTab === "ngữ pháp") {
        if (!structure.trim()) return; // Yêu cầu structure cho ngữ pháp
        noteData.structure = structure.trim();
        noteData.explanation = newMeaning.trim();
        noteData.examples = examples.trim().split("\n").filter((ex) => ex.trim()); // Chuyển dòng thành array
      } else {
        noteData.word = newWord.trim();
        noteData.meaning = newMeaning.trim();
        noteData.exampleOrExplanation = exampleOrExplanation.trim() || undefined;
      }

      await addDoc(notesRef, noteData);
      setNotification(
        `${currentTab === "ngữ pháp" ? "Quy tắc" : "Từ"} "${newWord || structure}" đã được thêm vào Note`
      );
      setTimeout(() => setNotification(""), 3000);
      setNewWord("");
      setNewMeaning("");
      setExampleOrExplanation("");
      setStructure("");
      setExamples("");
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  // Hàm xóa một note
  const handleDeleteNote = async (id) => {
    try {
      const noteRef = doc(db, "test", id);
      await deleteDoc(noteRef);
      setNotification("Đã xóa từ thành công!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Hàm chỉnh sửa note
  const handleEditNote = async (note) => {
    try {
      const noteRef = doc(db, "test", note.id);
      const docSnap = await getDoc(noteRef);
      if (docSnap.exists()) {
        setEditingNote({ ...note });
        setIsEditing(true);
        // Cập nhật state form dựa trên tab hiện tại
        if (currentTab === "ngữ pháp") {
          setStructure(note.structure || "");
          setNewMeaning(note.explanation || "");
          setExamples((note.examples || []).join("\n")); // Chuyển array examples thành text với newline
        } else {
          setNewWord(note.word || "");
          setNewMeaning(note.meaning || "");
          setExampleOrExplanation(note.exampleOrExplanation || "");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setNotes((prevNotes) => prevNotes.filter((n) => n.id !== note.id));
        setNotification(`Lỗi: Tài liệu "${note.word || note.structure}" (ID: ${note.id}) không tồn tại trong Firestore! Đã xóa khỏi danh sách.`);
        setTimeout(() => setNotification(""), 3000);
        console.warn(`Document ${note.id} not found when editing, removed from state`);
      }
    } catch (error) {
      console.error("Error checking document:", error.message);
      setNotification("Lỗi khi kiểm tra tài liệu! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm lưu thay đổi khi chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editingNote) return;

    try {
      const noteRef = doc(db, "test", editingNote.id);
      const docSnap = await getDoc(noteRef);
      if (docSnap.exists()) {
        const updateData = {
          type: editingNote.type,
          addedDate: editingNote.addedDate,
        };

        if (currentTab === "ngữ pháp") {
          updateData.structure = structure || editingNote.structure;
          updateData.explanation = newMeaning || editingNote.explanation;
          updateData.examples = examples.trim().split("\n").filter((ex) => ex.trim()) || editingNote.examples;
        } else {
          updateData.word = newWord || editingNote.word;
          updateData.meaning = newMeaning || editingNote.meaning;
          updateData.exampleOrExplanation = exampleOrExplanation || editingNote.exampleOrExplanation || undefined;
        }

        await updateDoc(noteRef, updateData);
        const updatedNotes = notes.map((note) =>
          note.id === editingNote.id ? { ...note, ...updateData } : note
        );
        setNotes(updatedNotes);
        setNotification(
          `${currentTab === "ngữ pháp" ? "Quy tắc" : "Từ"} "${
            newWord || structure || editingNote.word || editingNote.structure
          }" đã được cập nhật thành công`
        );
      } else {
        setNotification("Lỗi: Tài liệu không tồn tại trong Firestore!");
      }
      setTimeout(() => setNotification(""), 3000);
      setEditingNote(null);
      setIsEditing(false);
      setNewWord("");
      setNewMeaning("");
      setExampleOrExplanation("");
      setStructure("");
      setExamples("");
    } catch (error) {
      console.error("Error updating note:", error.message);
      setNotification("Lỗi khi cập nhật ghi chú! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm xóa tất cả note
  const handleDeleteAllNotes = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tất cả ghi chú?")) return;

    try {
      const notesRef = collection(db, "test");
      const querySnapshot = await getDocs(notesRef);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnapshot) => {
        batch.delete(doc(db, "test", docSnapshot.id));
      });
      await batch.commit();
      setNotification("Đã xóa toàn bộ ghi chú!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error deleting all notes:", error);
      setNotification("Lỗi khi xóa tất cả ghi chú! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm sắp xếp từ vựng A-Z
  const handleSortAZ = async () => {
    try {
      const notesRef = collection(db, "test");
      const querySnapshot = await getDocs(notesRef);
      const allNotes = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((note) => (note.word || note.structure) && note.type);

      console.log("All notes fetched:", allNotes);

      const notesToSort = allNotes
        .filter((note) => note.type === currentTab)
        .sort((a, b) => (a.word || a.structure).toLowerCase().localeCompare((b.word || b.structure).toLowerCase()));
      const otherNotes = allNotes.filter((note) => note.type !== currentTab);

      const batch = writeBatch(db);
      let updatedCount = 0;
      for (const note of notesToSort) {
        const noteRef = doc(db, "test", note.id);
        const docSnap = await getDoc(noteRef);
        if (docSnap.exists()) {
          batch.update(noteRef, note);
          updatedCount++;
        } else {
          console.warn(`Document ${note.id} not found, skipping update`);
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`Successfully updated ${updatedCount} documents in Firestore`);
      } else {
        console.log("No valid documents to update in Firestore");
      }

      // Cập nhật state với thứ tự mới
      setNotes([...notesToSort, ...otherNotes]);

      setNotification(`✅ Đã sắp xếp "${currentTab}" theo thứ tự A-Z`);
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error sorting notes:", error);
      setNotification("Lỗi khi sắp xếp ghi chú! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
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
            const notesRef = collection(db, "test");
            const batch = writeBatch(db);

            importedNotes.forEach((note) => {
              const newDocRef = doc(notesRef);
              batch.set(newDocRef, {
                ...note,
                addedDate: new Date().toISOString()
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
              const [wordOrStructure, meaningOrExplanation, type] = line.split("|").map(s => s.trim());
              importedNotes.push({
                [type === "ngữ pháp" ? "structure" : "word"]: wordOrStructure,
                [type === "ngữ pháp" ? "explanation" : "meaning"]: meaningOrExplanation,
                type: type || currentTab,
                addedDate: new Date().toISOString()
              });
            }
          });

          const notesRef = collection(db, "test");
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
      setNotification("Lỗi khi nhập file! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm export file .txt
  const handleExportTXT = async () => {
    try {
      const content = notes
        .map((note) => `${note.word || note.structure} | ${note.meaning || note.explanation} | ${note.type}`)
        .join("\n");

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "english-notes.txt";
      link.click();
      URL.revokeObjectURL(url);
      setNotification("Đã xuất file .txt thành công!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error exporting TXT file:", error);
      setNotification("Lỗi khi export file TXT! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const filteredNotes = notes
    .filter((note) => note.type === currentTab)
    .filter((note) => {
      const noteContent = `${note.word || note.structure} ${note.meaning || note.explanation}`.toLowerCase();
      const keyword = removeVietnameseTones(searchTerm).toLowerCase();
      const normalizedNote = removeVietnameseTones(noteContent).toLowerCase();
      return normalizedNote.includes(keyword);
    });

  const highlightKeyword = (text, keyword) => {
    if (!keyword) return text;
    const normalizedKeyword = removeVietnameseTones(keyword).toLowerCase();
    const normalizedText = removeVietnameseTones(text).toLowerCase();
    const originalText = text;

    const regex = new RegExp(`(${normalizedKeyword})`, "gi");
    const parts = originalText.split(regex);

    return parts.map((part, index) => {
      if (removeVietnameseTones(part).toLowerCase().includes(normalizedKeyword)) {
        return <mark key={index} className="bg-yellow-300">{part}</mark>;
      }
      return part;
    });
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

        {/* 🟦 GOOGLE DỊCH - LUÔN HIỂN THỈ */}
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
                placeholder={currentTab === "ngữ pháp" ? "Nhập cấu trúc (e.g., S + V + O)..." : "Nhập từ tiếng Anh..."}
                value={currentTab === "ngữ pháp" ? structure : newWord}
                onChange={(e) =>
                  currentTab === "ngữ pháp" ? setStructure(e.target.value) : setNewWord(e.target.value)
                }
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
            </div>
            <div className="mb-4">
              <textarea
                placeholder={currentTab === "ngữ pháp" ? "Nhập giải thích..." : "Nhập nghĩa tiếng Việt..."}
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
            </div>
            {currentTab === "ngữ pháp" && (
              <div className="mb-4">
                <textarea
                  placeholder="Nhập ví dụ (mỗi dòng một ví dụ, e.g., I + eat + apple)"
                  value={examples}
                  onChange={(e) => setExamples(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>
            )}
            {currentTab !== "ngữ pháp" && (
              <div className="mb-4">
                <textarea
                  placeholder="Nhập ví dụ hoặc giải thích thêm (tùy chọn)..."
                  value={exampleOrExplanation}
                  onChange={(e) => setExampleOrExplanation(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>
            )}
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
                placeholder={currentTab === "ngữ pháp" ? "Nhập cấu trúc (e.g., S + V + O)..." : "Nhập từ tiếng Anh..."}
                value={currentTab === "ngữ pháp" ? structure : newWord}
                onChange={(e) =>
                  currentTab === "ngữ pháp" ? setStructure(e.target.value) : setNewWord(e.target.value)
                }
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="mb-4">
              <textarea
                placeholder={currentTab === "ngữ pháp" ? "Nhập giải thích..." : "Nhập nghĩa tiếng Việt..."}
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {currentTab === "ngữ pháp" && (
              <div className="mb-4">
                <textarea
                  placeholder="Nhập ví dụ (mỗi dòng một ví dụ, e.g., I + eat + apple)"
                  value={examples}
                  onChange={(e) => setExamples(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
            {currentTab !== "ngữ pháp" && (
              <div className="mb-4">
                <textarea
                  placeholder="Nhập ví dụ hoặc giải thích thêm (tùy chọn)..."
                  value={exampleOrExplanation}
                  onChange={(e) => setExampleOrExplanation(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
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
              onClick={handleExportTXT}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Export .txt
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

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            {console.log("Modal is rendering")}
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Xác nhận xóa
              </h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa từ "{noteToDelete?.word || noteToDelete?.structure}" không?
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
                  <div className="flex-1 pr-4">
                    <span>
                      {highlightKeyword(
                        `${currentTab === "ngữ pháp" ? note.structure : note.word}: ${
                          currentTab === "ngữ pháp" ? note.explanation : note.meaning
                        }`,
                        searchTerm
                      )}
                    </span>
                    {(currentTab === "ngữ pháp" ? note.examples : [note.exampleOrExplanation])
                      .filter((ex) => ex)
                      .map((ex, index) => (
                        <p key={index} className="text-sm italic text-blue-500 mt-1 mb-0">
                          {ex}
                        </p>
                      ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => speakText(note.word || note.structure)}
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
                        setNoteToDelete(note);
                        setShowDeleteModal(true);
                        console.log("showDeleteModal:", true);
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
