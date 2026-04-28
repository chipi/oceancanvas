import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Gallery() {
  return <div>OceanCanvas Gallery — scaffold</div>;
}

function Dashboard() {
  return <div>Dashboard — scaffold</div>;
}

function RecipeEditor() {
  return <div>Recipe Editor — scaffold</div>;
}

function VideoEditor() {
  return <div>Video Editor — scaffold</div>;
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
