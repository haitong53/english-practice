import { useState, useEffect } from "react";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  // Load notes từ localStorage khi mở app
  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem("personalNotes")) || [];
    setNotes(savedNotes);
  }, []);

  // Hàm lưu ghi chú vào localStorage
  const saveNotesToLocalStorage = (updatedNotes) => {
    localStorage.setItem("personalNotes", JSON.stringify(updatedNotes));
  };

  // Hàm thêm ghi chú mới
  const handleAddNote = () => {
    if (newNote.trim() === "") return;
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
    setNewNote("");
  };

  // Hàm xóa ghi chú
  const handleDeleteNote = (index) => {
    const updatedNotes = notes.filter((_, i) => i !== index);
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
  };

  // Hàm chỉnh sửa ghi chú
  const handleEditNote = (index) => {
    setNewNote(notes[index]);
    setEditingIndex(index);
  };

  // Hàm cập nhật ghi chú đã chỉnh sửa
  const handleUpdateNote = () => {
    if (newNote.trim() === "") return;
    const updatedNotes = [...notes];
    updatedNotes[editingIndex] = newNote;
    setNotes(updatedNotes);
    saveNotesToLocalStorage(updatedNotes);
    setNewNote("");
    setEditingIndex(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 font-sans text-gray-800">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-700">Personal Notes</h1>
        <p className="text-gray-600 mt-2">Write and save your personal notes locally.</p>
      </header>

      <main className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type your note here..."
            className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {editingIndex !== null ? (
            <button
              onClick={handleUpdateNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
            >
              Update
            </button>
          ) : (
            <button
              onClick={handleAddNote}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
            >
              Add
            </button>
          )}
        </div>

        <ul className="space-y-3">
          {notes.length === 0 ? (
            <li className="text-gray-500 italic text-center py-4">No notes yet. Start adding some!</li>
          ) : (
            notes.map((note, index) => (
              <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                <span>{note}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditNote(index)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteNote(index)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </main>

      <footer className="text-center text-gray-500 text-sm mt-8">
        &copy; 2025 Personal Notes Tool. Built for self-use.
      </footer>
    </div>
  );
}
