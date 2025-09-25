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
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Đường dẫn đến file firebase.js

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
  const [structure, setStructure] = useState("");
  const [examples, setExamples] = useState("");
  const [topic, setTopic] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [availableTopics, setAvailableTopics] = useState(["tenses", "conditionals", "modals", "passive voice"]);
  const [newTopic, setNewTopic] = useState("");
  const [isManagingTopics, setIsManagingTopics] = useState(false);
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

  // Hàm thêm chủ đề mới
  const handleAddTopic = () => {
    if (newTopic.trim() && !availableTopics.includes(newTopic.trim())) {
      setAvailableTopics([...availableTopics, newTopic.trim()]);
      setNewTopic("");
      setNotification("Chủ đề mới đã được thêm thành công!");
      setTimeout(() => setNotification(""), 3000);
    } else if (availableTopics.includes(newTopic.trim())) {
      setNotification("Chủ đề này đã tồn tại!");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm xóa chủ đề
  const handleRemoveTopic = (topicToRemove) => {
    setAvailableTopics(availableTopics.filter((t) => t !== topicToRemove));
    if (topic === topicToRemove) setTopic("");
    setNotification("Chủ đề đã được xóa!");
    setTimeout(() => setNotification(""), 3000);
  };

  // Hàm thêm từ vựng
  const handleAddVocabulary = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;

    try {
      const notesRef = collection(db, "test");
      const noteData = {
        type: "từ vựng",
        word: newWord.trim(),
        meaning: newMeaning.trim(),
        exampleOrExplanation: exampleOrExplanation.trim() || "",
        addedDate: new Date().toISOString(),
      };

      await addDoc(notesRef, noteData);
      setNotification(`Từ "${newWord}" đã được thêm vào Note`);
      setTimeout(() => setNotification(""), 3000);
      setNewWord("");
      setNewMeaning("");
      setExampleOrExplanation("");
    } catch (error) {
      console.error("Error adding vocabulary:", error);
    }
  };

  // Hàm thêm ngữ pháp
  const handleAddGrammar = async () => {
    if (!structure.trim() || !newMeaning.trim() || !topic.trim()) return;

    try {
      const notesRef = collection(db, "test");
      const noteData = {
        type: "ngữ pháp",
        structure: structure.trim(),
        explanation: newMeaning.trim(),
        examples: examples.trim().split("\n").filter((ex) => ex.trim()),
        topic: topic.trim(),
        hashtags: hashtags.trim().split(",").map((tag) => tag.trim()).filter((tag) => tag),
        addedDate: new Date().toISOString(),
      };

      await addDoc(notesRef, noteData);
      setNotification(`Quy tắc "${structure}" đã được thêm vào Note`);
      setTimeout(() => setNotification(""), 3000);
      setStructure("");
      setNewMeaning("");
      setExamples("");
      setTopic("");
      setHashtags("");
    } catch (error) {
      console.error("Error adding grammar:", error);
    }
  };

  // Hàm thêm thành ngữ
  const handleAddIdiom = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;

    try {
      const notesRef = collection(db, "test");
      const noteData = {
        type: "thành ngữ",
        word: newWord.trim(),
        meaning: newMeaning.trim(),
        exampleOrExplanation: exampleOrExplanation.trim() || "",
        addedDate: new Date().toISOString(),
      };

      await addDoc(notesRef, noteData);
      setNotification(`Thành ngữ "${newWord}" đã được thêm vào Note`);
      setTimeout(() => setNotification(""), 3000);
      setNewWord("");
      setNewMeaning("");
      setExampleOrExplanation("");
    } catch (error) {
      console.error("Error adding idiom:", error);
    }
  };

  // Hàm xóa note
  const handleDeleteNote = async (id) => {
    try {
      const noteRef = doc(db, "test", id);
      await deleteDoc(noteRef);
      setNotification("Đã xóa ghi chú thành công!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Hàm chỉnh sửa từ vựng
  const handleEditVocabulary = async () => {
    if (!editingNote) return;

    try {
      const noteRef = doc(db, "test", editingNote.id);
      const docSnap = await getDoc(noteRef);
      if (docSnap.exists()) {
        const updateData = {
          word: newWord.trim() || editingNote.word,
          meaning: newMeaning.trim() || editingNote.meaning,
          type: "từ vựng",
          addedDate: editingNote.addedDate,
          exampleOrExplanation: exampleOrExplanation.trim() || "",
        };

        await updateDoc(noteRef, updateData);
        const updatedNotes = notes.map((note) =>
          note.id === editingNote.id ? { ...note, ...updateData } : note
        );
        setNotes(updatedNotes);
        setNotification(`Từ "${newWord || editingNote.word}" đã được cập nhật thành công`);
      } else {
        setNotification("Lỗi: Tài liệu không tồn tại trong Firestore!");
      }
      setTimeout(() => setNotification(""), 3000);
      setEditingNote(null);
      setIsEditing(false);
      setNewWord("");
      setNewMeaning("");
      setExampleOrExplanation("");
    } catch (error) {
      console.error("Error updating vocabulary:", error.message);
      setNotification("Lỗi khi cập nhật từ vựng! Chi tiết: " + error.message);
      setTimeout(() => setNotification(""), 3000);
    }
  };

  // Hàm chỉnh sửa ngữ pháp
  // Hàm chỉnh sửa ngữ pháp
    const handleEditGrammar = async () => {
      if (!editingNote) return;
    
      try {
        const noteRef = doc(db, "test", editingNote.id);
        const docSnap = await getDoc(noteRef);
        if (docSnap.exists()) {
          const trimmedTopic = topic.trim();
          if (!trimmedTopic) {
            setNotification("Vui lòng chọn hoặc nhập một chủ đề (topic) trước khi lưu!");
            setTimeout(() => setNotification(""), 3000);
            return;
          }
    
          const updateData = {
            structure: structure.trim() || editingNote.structure,
            explanation: newMeaning.trim() || editingNote.explanation,
            examples: examples.trim().split("\n").filter((ex) => ex.trim()) || editingNote.examples,
            topic: trimmedTopic || editingNote.topic,
            hashtags: hashtags.trim().split(",").map((tag) => tag.trim()).filter((tag) => tag) || editingNote.hashtags,
            type: "ngữ pháp",
            addedDate: editingNote.addedDate,
          };
    
          await updateDoc(noteRef, updateData);
          const updatedNotes = notes.map((note) =>
            note.id === editingNote.id ? { ...note, ...updateData } : note
          );
          setNotes(updatedNotes);
          setNotification(`Quy tắc "${structure || editingNote.structure}" đã được cập nhật thành công`);
        } else {
          setNotification("Lỗi: Tài liệu không tồn tại trong Firestore!");
        }
        setTimeout(() => setNotification(""), 3000);
        setEditingNote(null);
        setIsEditing(false);
        setStructure("");
        setNewMeaning("");
        setExamples("");
        setTopic("");
        setHashtags("");
      } catch (error) {
        console.error("Error updating grammar:", error.message);
        setNotification("Lỗi khi cập nhật ngữ pháp! Chi tiết: " + error.message);
        setTimeout(() => setNotification(""), 3000);
      }
    };

  // Hàm chỉnh sửa thành ngữ
  const handleEditIdiom = async () => {
    if (!editingNote) return;

    try {
      const noteRef = doc(db, "test", editingNote.id);
      const docSnap = await getDoc(noteRef);
      if (docSnap.exists()) {
        const updateData = {
          word: newWord.trim() || editingNote.word,
          meaning: newMeaning.trim() || editingNote.meaning,
          type: "thành ngữ",
          addedDate: editingNote.addedDate,
          exampleOrExplanation: exampleOrExplanation.trim() || "",
        };

        await updateDoc(noteRef, updateData);
        const updatedNotes = notes.map((note) =>
          note.id === editingNote.id ? { ...note, ...updateData } : note
        );
        setNotes(updatedNotes);
        setNotification(`Thành ngữ "${newWord || editingNote.word}" đã được cập nhật thành công`);
      } else {
        setNotification("Lỗi: Tài liệu không tồn tại trong Firestore!");
      }
      setTimeout(() => setNotification(""), 3000);
      setEditingNote(null);
      setIsEditing(false);
      setNewWord("");
      setNewMeaning("");
      setExampleOrExplanation("");
    } catch (error) {
      console.error("Error updating idiom:", error.message);
      setNotification("Lỗi khi cập nhật thành ngữ! Chi tiết: " + error.message);
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

  // Hàm sắp xếp A-Z
  const handleSortAZ = async () => {
    try {
      const notesRef = collection(db, "test");
      const querySnapshot = await getDocs(notesRef);
      const allNotes = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((note) => (note.word || note.structure) && note.type);

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

      if (updatedCount > 0) await batch.commit();

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
                addedDate: new Date().toISOString(),
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
              const [wordOrStructure, meaningOrExplanation, type, topic, tags] = line.split("|").map(s => s.trim());
              importedNotes.push({
                [type === "ngữ pháp" ? "structure" : "word"]: wordOrStructure,
                [type === "ngữ pháp" ? "explanation" : "meaning"]: meaningOrExplanation,
                type: type || currentTab,
                [type === "ngữ pháp" ? "topic" : ""]: topic || "",
                [type === "ngữ pháp" ? "hashtags" : ""]: tags ? tags.split(",").map(t => t.trim()) : [],
                exampleOrExplanation: type !== "ngữ pháp" ? "" : undefined,
                addedDate: new Date().toISOString(),
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
          setNotification(`Đã nhập ${importedNotes.length} ghi chú thành công!`);
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
        .map((note) => `${note.word || note.structure} | ${note.meaning || note.explanation} | ${note.type} | ${note.topic || ""} | ${note.hashtags?.join(", ") || ""}`)
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

  // Hàm filter theo tag
  const handleFilterByTag = (tag) => {
    setSearchTerm(tag);
  };

  const filteredNotes = notes
    .filter((note) => note.type === currentTab)
    .filter((note) => {
      const noteContent = `${note.word || note.structure} ${note.meaning || note.explanation}`.toLowerCase();
      const keyword = removeVietnameseTones(searchTerm).toLowerCase();
      const normalizedNote = removeVietnameseTones(noteContent).toLowerCase();
      return normalizedNote.includes(keyword) || (note.hashtags && note.hashtags.some((ht) => removeVietnameseTones(ht).toLowerCase().includes(keyword)));
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
        {/* Header */}
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

        {/* Google Dịch */}
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
              <div className="mb-2">
                {currentTab === "ngữ pháp" && (
                  <div>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm mb-2"
                    >
                      <option value="">Chọn chủ đề</option>
                      {availableTopics.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {isManagingTopics ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="Nhập chủ đề mới..."
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                        />
                        <button
                          onClick={handleAddTopic}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
                        >
                          Thêm
                        </button>
                        <button
                          onClick={() => setIsManagingTopics(false)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded text-sm"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsManagingTopics(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm mt-2"
                      >
                        Quản lý chủ đề
                      </button>
                    )}
                    {availableTopics.length > 0 && isManagingTopics && (
                      <div className="mt-2">
                        {availableTopics.map((t) => (
                          <span
                            key={t}
                            className="inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded-full mr-2 mb-2 cursor-pointer hover:bg-gray-300"
                            onClick={() => handleRemoveTopic(t)}
                          >
                            {t} ✕
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
              {currentTab === "ngữ pháp" && (
                <div className="mb-4">
                  <textarea
                    placeholder="Nhập hashtag (tách bằng dấu phẩy, e.g., simple past, irregular verbs)"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full h-12 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
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
                onClick={() => {
                  if (currentTab === "từ vựng") handleEditVocabulary();
                  else if (currentTab === "ngữ pháp") handleEditGrammar();
                  else if (currentTab === "thành ngữ") handleEditIdiom();
                }}
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
              <div className="mb-2">
                {currentTab === "ngữ pháp" && (
                  <div>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm mb-2"
                    >
                      <option value="">Chọn chủ đề</option>
                      {availableTopics.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {isManagingTopics ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="Nhập chủ đề mới..."
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                        />
                        <button
                          onClick={handleAddTopic}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
                        >
                          Thêm
                        </button>
                        <button
                          onClick={() => setIsManagingTopics(false)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded text-sm"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsManagingTopics(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm mt-2"
                      >
                        Quản lý chủ đề
                      </button>
                    )}
                    {availableTopics.length > 0 && isManagingTopics && (
                      <div className="mt-2">
                        {availableTopics.map((t) => (
                          <span
                            key={t}
                            className="inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded-full mr-2 mb-2 cursor-pointer hover:bg-gray-300"
                            onClick={() => handleRemoveTopic(t)}
                          >
                            {t} ✕
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
              {currentTab === "ngữ pháp" && (
                <div className="mb-4">
                  <textarea
                    placeholder="Nhập hashtag (tách bằng dấu phẩy, e.g., simple past, irregular verbs)"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full h-12 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                onClick={() => {
                  if (currentTab === "từ vựng") handleAddVocabulary();
                  else if (currentTab === "ngữ pháp") handleAddGrammar();
                  else if (currentTab === "thành ngữ") handleAddIdiom();
                }}
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
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Xác nhận xóa</h3>
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
          className="flex flex-row justify-between items-center bg-gray-50 p-3 rounded-md transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-[1.02]"
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
          {currentTab === "ngữ pháp" && note.hashtags && (
            <div className="flex flex-wrap gap-2 mt-2">
              {note.hashtags.map((tag, index) => (
                <span
                  key={index}
                  onClick={() => handleFilterByTag(tag)}
                  className="cursor-pointer text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full hover:bg-indigo-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1 items-end">
            <button
              onClick={() => speakText(note.word || note.structure)}
              className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              title="Phát âm"
            >
              🔊
            </button>
            <button
              onClick={() => {
                setEditingNote(note);
                setIsEditing(true);
                if (currentTab === "ngữ pháp") {
                  setStructure(note.structure || "");
                  setNewMeaning(note.explanation || "");
                  setExamples((note.examples || []).join("\n"));
                  setTopic(note.topic || "");
                  setHashtags((note.hashtags || []).join(", "));
                } else {
                  setNewWord(note.word || "");
                  setNewMeaning(note.meaning || "");
                  setExampleOrExplanation(note.exampleOrExplanation || "");
                }
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Sửa
            </button>
            <button
              onClick={() => {
                setNoteToDelete(note);
                setShowDeleteModal(true);
              }}
              className="text-sm text-red-600 hover:text-red-800 hover:underline transition-colors"
            >
              Xóa
            </button>
          </div>
        </li>
      ))
    ) : (
      <li className="text-gray-500 italic text-center py-4">Không có ghi chú nào.</li>
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
