import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Gallery } from './pages/Gallery';

function RecipeEditor() {
  return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Recipe Editor — coming soon</div>;
}

function VideoEditor() {
  return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Video Editor — coming in Slice 3</div>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/:recipe" element={<Gallery />} />
        <Route path="/gallery/:recipe/:date" element={<Gallery />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:source" element={<Dashboard />} />
        <Route path="/dashboard/:source/explorer" element={<Dashboard />} />
        <Route path="/recipes" element={<RecipeEditor />} />
        <Route path="/recipes/new" element={<RecipeEditor />} />
        <Route path="/recipes/:id" element={<RecipeEditor />} />
        <Route path="/timelapse/:recipe" element={<VideoEditor />} />
      </Routes>
    </BrowserRouter>
  );
}
