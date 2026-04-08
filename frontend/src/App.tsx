import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Agents from './pages/Agents';
import Flows from './pages/Flows';
import Analytics from './pages/Analytics';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import Login from './pages/Login';

const queryClient = new QueryClient();

function App() {
  const isAuthenticated = localStorage.getItem('token');

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/messages"
            element={isAuthenticated ? <Messages /> : <Navigate to="/login" />}
          />
          <Route
            path="/agents"
            element={isAuthenticated ? <Agents /> : <Navigate to="/login" />}
          />
          <Route
            path="/flows"
            element={isAuthenticated ? <Flows /> : <Navigate to="/login" />}
          />
          <Route
            path="/analytics"
            element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />}
          />
          <Route
            path="/templates"
            element={isAuthenticated ? <Templates /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
