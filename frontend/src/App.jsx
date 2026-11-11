import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { useHealth } from './hooks/useHealth'
import Home from './pages/Home'
import ImageDetection from './pages/ImageDetection'
import VideoAnalytics from './pages/VideoAnalytics'
import LiveCamera from './pages/LiveCamera'
import CctvMonitoring from './pages/CctvMonitoring'
import './App.css'

export default function App() {
  const health = useHealth()

  return (
    <div className="app-shell">
      <Sidebar health={health} />
      <div className="app-main">
        <Topbar health={health} />
        <main className="page">
          <Routes>
            <Route path="/" element={<Home health={health} />} />
            <Route path="/image" element={<ImageDetection health={health} />} />
            <Route path="/video" element={<VideoAnalytics health={health} />} />
            <Route path="/camera" element={<LiveCamera health={health} />} />
            <Route path="/cctv" element={<CctvMonitoring health={health} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
