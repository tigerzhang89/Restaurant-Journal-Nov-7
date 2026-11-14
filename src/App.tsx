import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from './data/AppContext'
import { RequireAuth } from './components/Shell'
import Login from './pages/Login'
import List from './pages/List'
import Log from './pages/Log'
import Detail from './pages/Detail'
import Recommend from './pages/Recommend'
import Share from './pages/Share'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/s/:slug" element={<Share />} />
          <Route element={<RequireAuth />}>
            <Route index element={<List />} />
            <Route path="log" element={<Log />} />
            <Route path="r/:id" element={<Detail />} />
            <Route path="recommend" element={<Recommend />} />
          </Route>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
