import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
// import SearchEngine from './components/SearchEngine';
// import AddDictionary from './components/AddDictionary';
// import UploadGuide from './components/UploadGuide';
import AddAbbreviations from './components/AddAbbreviations';
import AddDictionaryWords from './components/AddDictionaryWords';
import UploadUserGuide from './components/UploadUserGuide';
import UploadForm from './components/UploadForm';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
       <Route path="/search" element={<UploadForm />} />
        <Route path="/dictionary" element={<AddDictionaryWords />} />
        <Route path="/guide" element={<UploadUserGuide />} />
        <Route path="/abbreviations" element={<AddAbbreviations />} />

      </Routes>
    </BrowserRouter>
  );
}
