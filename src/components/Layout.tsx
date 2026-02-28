import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <nav className="tabs">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Events
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Stats
        </NavLink>
        <NavLink to="/teams" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Teams
        </NavLink>
        <NavLink to="/matchups" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Matchups
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Settings
        </NavLink>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
