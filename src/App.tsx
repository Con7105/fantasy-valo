import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Events } from './pages/Events';
import { MatchList } from './pages/MatchList';
import { Fantasy } from './pages/Fantasy';
import { RosterBuilder } from './pages/RosterBuilder';
import { Settings } from './pages/Settings';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Events />} />
            <Route path="matches" element={<MatchList />} />
            <Route path="fantasy" element={<Fantasy />} />
            <Route path="fantasy/roster" element={<RosterBuilder />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
