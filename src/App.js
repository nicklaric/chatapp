import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import ChatRoom from './pages/ChatRoom';
import CreateChat from './pages/CreateChat';
import JoinChat from './pages/JoinChat';
import ChatInvite from './pages/ChatInvite';
import NotFound from './pages/NotFound';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="chat">
            <Route path="create" element={
              <PrivateRoute>
                <CreateChat />
              </PrivateRoute>
            } />
            <Route path="join" element={
              <PrivateRoute>
                <JoinChat />
              </PrivateRoute>
            } />
            <Route path="invite" element={<ChatInvite />} />
            <Route path=":chatId" element={
              <PrivateRoute>
                <ChatRoom />
              </PrivateRoute>
            } />
          </Route>
          
          <Route path="404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </ChatProvider>
  );
}

export default App; 