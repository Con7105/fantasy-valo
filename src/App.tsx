import { useParams } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { DraftProvider } from './context/DraftContext';
import { LeagueProvider } from './context/LeagueContext';
import { Layout } from './components/Layout';
import { Events } from './pages/Events';
import { MatchList } from './pages/MatchList';
import { Fantasy } from './pages/Fantasy';
import { RosterBuilder } from './pages/RosterBuilder';
import { League } from './pages/League';
import { CreateLeague } from './pages/CreateLeague';
import { LeaguePage } from './pages/LeaguePage';
import { DraftRoom } from './pages/DraftRoom';
import { Settings } from './pages/Settings';
import './App.css';

function DraftRoomWrapper() {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <DraftProvider roomId={roomId ?? null}>
      <DraftRoom />
    </DraftProvider>
  );
}

function LeaguePageWrapper() {
  const { leagueId } = useParams<{ leagueId: string }>();
  return (
    <LeagueProvider leagueId={leagueId ?? null}>
      <LeaguePage />
    </LeagueProvider>
  );
}

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
            <Route path="league" element={<League />} />
            <Route path="league/new" element={<CreateLeague />} />
            <Route path="league/:leagueId" element={<LeaguePageWrapper />} />
            <Route path="draft/:roomId" element={<DraftRoomWrapper />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
