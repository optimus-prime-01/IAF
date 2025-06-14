import React, { useState } from "react";
import axios from "axios";

export default function UploadForm() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF file.");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("pdf", file);

    try {
      setLoading(true);
      await axios.post("http://localhost:3001/api/pdfs/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-auth-token": "fake-token-for-now", // Replace with real token later
        },
      });
      alert("PDF uploaded successfully!");
      setTitle("");
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to upload PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleUpload}
      className="bg-white p-6 rounded shadow max-w-md mx-auto"
    >
      <h3 className="text-xl font-semibold mb-4">Upload a PDF</h3>

      <label className="block mb-2 text-sm font-medium text-gray-700">
        Title
      </label>
      <input
        type="text"
        placeholder="Enter PDF title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring focus:border-blue-300"
        required
      />

      <label className="block mb-2 text-sm font-medium text-gray-700">
        Select PDF
      </label>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="w-full p-2 border border-gray-300 rounded mb-4 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className={`w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
