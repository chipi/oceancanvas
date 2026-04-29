import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { DashboardSpread } from './pages/DashboardSpread';
import { Gallery } from './pages/Gallery';
import { GalleryDetail } from './pages/GalleryDetail';
import { RecipeEditor } from './pages/RecipeEditor';

function VideoEditor() {
  return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Video Editor — coming in Slice 3</div>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/:recipe" element={<GalleryDetail />} />
        <Route path="/gallery/:recipe/:date" element={<GalleryDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:source" element={<Dashboard />} />
        <Route path="/dashboard/:source/explorer" element={<DashboardSpread />} />
        <Route path="/recipes" element={<RecipeEditor />} />
        <Route path="/recipes/new" element={<RecipeEditor />} />
        <Route path="/recipes/:id" element={<RecipeEditor />} />
        <Route path="/timelapse/:recipe" element={<VideoEditor />} />
      </Routes>
    </BrowserRouter>
  );
}
