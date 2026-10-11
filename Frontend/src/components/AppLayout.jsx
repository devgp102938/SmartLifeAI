import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import './AppLayout.css';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout-root">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-layout-main-area">
        <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="app-layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
