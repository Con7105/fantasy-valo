import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <nav className="tabs">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Events
        </NavLink>
        <NavLink to="/fantasy" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Fantasy
        </NavLink>
        <NavLink to="/league" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          League
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
