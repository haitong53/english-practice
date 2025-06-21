import { useState, useEffect } from "react";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
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
    if (newNote.trim() === "") return;
    const newId = Date.now().toString();
    const updatedNotes = [
      ...notes,
      { id: newId, type: currentTab, content: newNote, addedDate: new Date().toISOString() },
    ];
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
    setNewNote("");
  };

  // Hàm xóa ghi chú
  const handleDeleteNote = (id) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
  };

  // Lọc theo tab và từ khóa tìm kiếm
  const filteredNotes = notes
    .filter((note) => note.type === currentTab)
    .filter((note) =>
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 font-sans text-gray-800">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-700">Học tiếng Anh</h1>
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
                  currentTab === type ? "bg-indigo-600 text-white" : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

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

      {/* Form nhập ghi chú mới */}
      <div className="max-w-2xl mx-auto mb-6">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Nhập nội dung..."
          className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={handleAddNote}
          className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
        >
          Lưu
        </button>
      </div>

      {/* Danh sách ghi chú */}
      <main className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        <ul className="space-y-3">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <li key={note.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                <span>{note.content}</span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Xóa
                </button>
              </li>
            ))
          ) : (
            <li className="text-gray-500 italic text-center py-4">
              Không tìm thấy kết quả phù hợp.
            </li>
          )}
        </ul>
      </main>

      <footer className="text-center text-gray-50
