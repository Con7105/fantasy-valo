import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { TeamsProvider } from './context/TeamsContext';
import { Layout } from './components/Layout';
import { Events } from './pages/Events';
import { MatchList } from './pages/MatchList';
import { Stats } from './pages/Stats';
import { Teams } from './pages/Teams';
import { Matchups } from './pages/Matchups';
import { Settings } from './pages/Settings';
import './App.css';

function App() {
  return (
    <AppProvider>
      <TeamsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Events />} />
              <Route path="matches" element={<MatchList />} />
              <Route path="stats" element={<Stats />} />
              <Route path="teams" element={<Teams />} />
              <Route path="matchups" element={<Matchups />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TeamsProvider>
    </AppProvider>
  );
}

export default App;
