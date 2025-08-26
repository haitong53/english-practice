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

// Hàm highlight từ khóa tìm kiếm
const highlightKeyword = (text, keyword) => {
  if (!keyword) return text;
  const regex = new RegExp(`(${removeVietnameseTones(keyword)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
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
  const [translateInput, setTranslateInput] = useState("");
  const [translateResult, setTranslateResult] = useState("");

  // Load notes khi mount
  useEffect(() => {
    const notesRef = collection(db, "test"); // Thay "notes" bằng "test"
    const unsubscribe = onSnapshot(notesRef, async (snapshot) => {
      const loadedDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const validNotes = await Promise.all(
        loadedDocs.map(async (note) => {
          const noteRef = doc(db, "test", note.id); // Thay "notes" bằng "test"
          const docSnap = await getDoc(noteRef);
          return docSnap.exists() ? note : null;
        })
      ).then((results) => results.filter((note) => note !== null));
      setNotes(validNotes);
    });

    return unsubscribe;
  }, []);

  // Hàm gọi Google Translate API
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
    if (!newWord.trim() || !newMeaning.trim()) return;

    try {
      const notesRef = collection(db, "test"); // Thay "notes" bằng "test"
      await addDoc(notesRef, {
        type: currentTab,
        word: newWord,
        meaning: newMeaning,
        exampleOrExplanation: exampleOrExplanation.trim(),
        addedDate: new Date().toISOString()
      });
      setNotification(`Từ "${newWord}" đã được thêm vào Note`);
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
      const noteRef = doc(db, "test", id); // Thay "notes" bằng "test"
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
      const noteRef = doc(db, "test", note.id); // Thay "notes" bằng "test"
      const docSnap = await getDoc(noteRef); // Kiểm tra tồn tại trước
      if (docSnap.exists()) {
        setEditingNote({ ...note });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setNotes((prevNotes) => prevNotes.filter((n) => n.id !== note.id));
        setNotification(`Lỗi: Tài liệu "${note.word}" (ID: ${note.id}) không tồn tại trong Firestore! Đã xóa khỏi danh sách.`);
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
      const noteRef = doc(db, "test", editingNote.id); // Thay "notes" bằng "test"
      const docSnap = await getDoc(noteRef);
      if (docSnap.exists()) {
        await updateDoc(noteRef, {
          word: editingNote.word,
          meaning: editingNote.meaning,
          exampleOrExplanation: editingNote.exampleOrExplanation,
          type: editingNote.type,
          addedDate: editingNote.addedDate
        });
        const updatedNotes = notes.map((note) =>
          note.id === editingNote.id ? { ...note, ...editingNote } : note
        );
        setNotes(updatedNotes);
        setNotification(`Từ "${editingNote.word}" đã được cập nhật thành công`);
      } else {
        setNotification("Lỗi: Tài liệu không tồn tại trong Firestore!");
      }
      setTimeout(() => setNotification(""), 3000);
      setEditingNote(null);
      setIsEditing(false);
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
      const notesRef = collection(db, "test"); // Thay "notes" bằng "test"
      const querySnapshot = await getDocs(notesRef);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnapshot) => {
        batch.delete(doc(db, "test", docSnapshot.id)); // Thay "notes" bằng "test"
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
      const notesRef = collection(db, "test"); // Thay "notes" bằng "test"
      const querySnapshot = await getDocs(notesRef);
      const allNotes = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((note) => note.word && note.type);

      console.log("All notes fetched:", allNotes);

      const notesToSort = allNotes.filter((note) => note.type === currentTab);
      const sortedNotes = [...notesToSort].sort((a, b) =>
        a.word.toLowerCase().localeCompare(b.word.toLowerCase())
      );
      const otherNotes = allNotes.filter((note) => note.type !== currentTab);
      const updatedNotes = [...sortedNotes, ...otherNotes];
      setNotes(updatedNotes);

      const batch = writeBatch(db);
      let updatedCount = 0;
      for (const note of sortedNotes) {
        const noteRef = doc(db, "test", note.id); // Thay "notes" bằng "test"
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
        console.log(`Updated ${updatedCount} documents in Firestore`);
      } else {
        console.log("No valid documents to update in Firestore");
      }

      setNotification(`✅ Đã sắp xếp "${currentTab}" theo thứ tự A-Z`);
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error sorting notes:", error);
      setNotification("Lỗi khi sắp xếp ghi chú! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm import file
  const handleImportFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      const batch = writeBatch(db);
      let count = 0;

      lines.forEach((line) => {
        const [word, meaning, type] = line.split("|").map((item) => item.trim());
        if (word && meaning && type) {
          const noteRef = doc(collection(db, "test")); // Thay "notes" bằng "test"
          batch.set(noteRef, {
            word,
            meaning,
            type,
            exampleOrExplanation: "",
            addedDate: new Date().toISOString()
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        setNotification(`Đã nhập ${count} ghi chú thành công!`);
      } else {
        setNotification("Không có dữ liệu hợp lệ để nhập!");
      }
      setTimeout(() => setNotification(""), 3000);
      event.target.value = ""; // Reset input
    } catch (error) {
      console.error("Error importing file:", error);
      setNotification("Lỗi khi nhập file! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm export file .txt
  const handleExportTXT = async () => {
    try {
      const textContent = notes
        .map(
          (note) =>
            `${note.word} | ${note.meaning} | ${note.type}${
              note.exampleOrExplanation ? ` | ${note.exampleOrExplanation}` : ""
            }`
        )
        .join("\n");
      const blob = new Blob([textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "english_notes.txt";
      a.click();
      URL.revokeObjectURL(url);
      setNotification("Đã xuất file .txt thành công!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error exporting file:", error);
      setNotification("Lỗi khi xuất file! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const filteredNotes = notes.filter((note) =>
    removeVietnameseTones(`${note.word} ${note.meaning}`).toLowerCase().includes(
      removeVietnameseTones(searchTerm).toLowerCase()
    )
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
          Ứng dụng học từ vựng tiếng Anh
        </h1>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 border rounded text-sm"
          />
          <select
            value={currentTab}
            onChange={(e) => setCurrentTab(e.target.value)}
            className="p-2 border rounded text-sm"
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Nhập từ mới..."
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            className="p-2 border rounded text-sm"
          />
          <input
            type="text"
            placeholder="Nghĩa của từ..."
            value={newMeaning}
            onChange={(e) => setNewMeaning(e.target.value)}
            className="p-2 border rounded text-sm"
          />
          <input
            type="text"
            placeholder="Ví dụ/Đ BV (tùy chọn)..."
            value={exampleOrExplanation}
            onChange={(e) => setExampleOrExplanation(e.target.value)}
            className="p-2 border rounded text-sm"
          />
          <button
            onClick={handleAddNote}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            Thêm
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Nhập văn bản để dịch..."
            value={translateInput}
            onChange={(e) => setTranslateInput(e.target.value)}
            className="p-2 border rounded text-sm"
          />
          <button
            onClick={() => handleTranslate("en", "vi")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Dịch (Anh-Việt)
          </button>
          <button
            onClick={() => handleTranslate("vi", "en")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Dịch (Việt-Anh)
          </button>
          <span className="p-2 text-sm">{translateResult}</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <label className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm cursor-pointer">
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

        <div className="mb-6 flex justify-end">
          <button
            onClick={handleDeleteAllNotes}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition text-sm"
          >
            🗑️ Xóa tất cả
          </button>
        </div>

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
      </header>

      <main className="bg-white rounded-xl shadow-md overflow-hidden p-6">
        <ul className="space-y-3">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <li
                key={note.id}
                className="flex justify-between items-start bg-gray-50 p-3 rounded-md transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-[1.02]"
              >
                <div className="flex-1 pr-4">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlightKeyword(`${note.word}: ${note.meaning}`, searchTerm)
                    }}
                  />
                  {note.exampleOrExplanation && (
                    <p className="text-sm italic text-blue-500 mt-1 mb-0">
                      {note.exampleOrExplanation}
                    </p>
                  )}
                </div>
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

      <footer className="text-center text-gray-500 text-sm mt-8">
        &copy; This is a vocabulary app for learning English.
      </footer>
    </div>
  );
}
