import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { MapCanvas } from './components/layout/MapCanvas';
import Projects from './pages/Projects';

import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Backstage view for projects */}
        <Route path="/projects" element={<Projects />} />
        
        {/* Main application shell */}
        <Route path="/" element={
          <RootLayout>
            <MapCanvas />
          </RootLayout>
        } />
      </Routes>
    </>
  );
}

export default App;
