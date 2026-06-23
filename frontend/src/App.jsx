import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

import NavBar         from "./components/NavBar";
import ChatSidebar    from "./components/ChatSidebar";
import Chatbox        from "./components/Chatbox";
import CurriculumPage from "./components/CurriculumPage";
import MyClassesPage from "./components/MyClassesPage";
import GradeSurgeon from "./components/GradeSurgeon";
import RippleEffect from "./components/RippleEffect";
import ProfilePage    from "./components/ProfilePage";
import AdminDashboard from "./components/AdminDashboard";
import Forbidden      from "./components/Forbidden";
import LandingPage    from "./components/LandingPage";
import CommandPalette from "./components/CommandPalette";
// WelcomeModal removed

import SignUp from "./SignUp";
import Login  from "./Login";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";

import "./index.css";

import { getApiBase } from "./lib/apiBase";
const API_BASE = getApiBase();

const DEFAULT_CHAT_MODE = "general";

function inferSessionMode(session) {
  if (!session) return DEFAULT_CHAT_MODE;
  if (session.mode) return session.mode;
  if (typeof session.id === "string" && session.id.startsWith("advising-")) {
    return "advising";
  }
  return DEFAULT_CHAT_MODE;
}

function createChatSession(mode = DEFAULT_CHAT_MODE) {
  return {
    id: `${mode}-${Date.now()}`,
    title: mode === "advising" ? "Advising Chat" : "New Chat",
    messages: [],
    pinned: false,
    archived: false,
    mode,
  };
}

function normalizeChatSession(session) {
  return {
    ...session,
    pinned: session.pinned || false,
    archived: session.archived || false,
    mode: inferSessionMode(session),
  };
}

function getLastSessionForMode(sessions, mode) {
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    if (inferSessionMode(sessions[i]) === mode) {
      return sessions[i];
    }
  }
  return null;
}

function ensureSessionForMode(sessions, mode) {
  const existing = getLastSessionForMode(sessions, mode);
  if (existing) {
    return { sessions, session: existing };
  }

  const created = createChatSession(mode);
  return { sessions: [...sessions, created], session: created };
}

function parseJwt(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) =>
          "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function RequireAuth({ children }) {
  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ChatLayout({
  sessions,
  activeId,
  activeMode,
  onNew,
  onSelect,
  onDelete,
  onSessionChange,
  onModeChange,
  onLogout,
  userEmail,
  onPin,
  onArchive,
  onRename,
  darkMode,
  onToggleTheme,
  onCollapse
}) {
  const activeSession = sessions.find((s) => s.id === activeId) || { messages: [] };
  return (
    <div className="app-layout">
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onNew={onNew}
        onSelect={onSelect}
        onDelete={onDelete}
        onLogout={onLogout}
        userEmail={userEmail}
        onPin={onPin}
        onArchive={onArchive}
        onRename={onRename}
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onCollapse={onCollapse}
      />
      {/* 🔥 UPDATE: Passing sessionId to Chatbox so it knows where to save */}
      <Chatbox
        key={activeId}
        sessionId={activeId} 
        initialMessages={activeSession.messages}
        mode={activeMode}
        onSessionChange={onSessionChange}
        onModeChange={onModeChange}
      />
    </div>
  );
}

function SidebarLayout({
  sessions,
  activeId,
  onNew,
  onSelect,
  onDelete,
  onLogout,
  userEmail,
  onPin,
  onArchive,
  onRename,
  darkMode,
  onToggleTheme,
  onCollapse,
  children
}) {
  return (
    <div className="app-layout">
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onNew={onNew}
        onSelect={onSelect}
        onDelete={onDelete}
        onLogout={onLogout}
        userEmail={userEmail}
        onPin={onPin}
        onArchive={onArchive}
        onRename={onRename}
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onCollapse={onCollapse}
      />
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [role, setRole]   = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false); // disabled

  // Dark mode state
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  // sync token ↔ localStorage & extract role
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      const { role: r } = parseJwt(token);
      setRole(r || null);
    } else {
      localStorage.removeItem("token");
      setRole(null);
    }
  }, [token]);

  // Manage dark mode
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Toggle sidebar CSS class on body
  // IMPORTANT: Also collapse sidebar when not authenticated to prevent overlay on login page
  useEffect(() => {
    const shouldCollapse = sidebarCollapsed || !token;
    document.body.classList.toggle('sidebar-collapsed', shouldCollapse);
  }, [sidebarCollapsed, token]);

  // Welcome modal disabled
  const dismissWelcome = () => setShowWelcome(false);

  // Cmd+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // chat‐session state
  const [sessions, setSessions] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("chat_sessions") || "[]").map(normalizeChatSession);
    const preferredMode = localStorage.getItem("chat_mode") || DEFAULT_CHAT_MODE;
    const initialSessions = saved.length ? saved : [createChatSession(DEFAULT_CHAT_MODE)];
    return ensureSessionForMode(initialSessions, preferredMode).sessions;
  });

  const [activeMode, setActiveMode] = useState(() => localStorage.getItem("chat_mode") || DEFAULT_CHAT_MODE);

  const [activeId, setActiveId] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("chat_sessions") || "[]").map(normalizeChatSession);
    const preferredMode = localStorage.getItem("chat_mode") || DEFAULT_CHAT_MODE;
    const initialSessions = saved.length ? saved : [createChatSession(DEFAULT_CHAT_MODE)];
    const { session } = ensureSessionForMode(initialSessions, preferredMode);
    return session.id;
  });
  
  useEffect(() => {
    localStorage.setItem("chat_sessions", JSON.stringify(sessions));
  }, [sessions]);

  // 🔥 NEW: Fetch Chat History from RDS & GROUP BY SESSION ID
  useEffect(() => {
    async function loadHistory() {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/chat-history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          
          if (data.history && data.history.length > 0) {
              const grouped = {};

              // Group the flat list of messages by their session_id
              data.history.forEach(item => {
                  const sid = item.session_id || "default";
                  if (!grouped[sid]) grouped[sid] = [];

                  // Add User Message
                  grouped[sid].push({
                    text: item.user,
                    sender: "user",
                    time: new Date(item.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                  });

                  // Add Bot Message
                  grouped[sid].push({
                    text: item.bot,
                    sender: "bot",
                    time: new Date(item.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                  });
              });

              // Convert the groups into your Session Objects
              const dbSessions = Object.keys(grouped).map(sid => ({
                  id: sid,
                  // Use the first message as the title (capped at 30 chars)
                  title: grouped[sid][0]?.text.slice(0, 30) || "Chat",
                  messages: grouped[sid],
                  pinned: false,
                  archived: false
              }));

              // Update state with database sessions
              setSessions(dbSessions);

              // Set the active chat to the most recent one (last in the list)
              if (dbSessions.length > 0) {
                setActiveId(dbSessions[dbSessions.length - 1].id);
              }
          } else {
              // New account or no history - reset to a fresh session
              // This clears any stale sessions from a previous account
              const freshId = Date.now().toString();
              setSessions([{ id: freshId, title: "New Chat", messages: [], pinned: false, archived: false }]);
              setActiveId(freshId);
          }
        }
      } catch (err) {
        console.error("Failed to load persistent chat history:", err);
      }
    }
    loadHistory();
  }, [token]); // Run once when token changes (login)

  // FIXED: session handlers
  const handleNew = () => {
    const newChat = createChatSession(activeMode);
    setSessions((prev) => [...prev, newChat]); // Append to end
    setActiveId(newChat.id);
    navigate("/chat");
  };

  const handleSelect = (id) => {
    const session = sessions.find((s) => s.id === id);
    setActiveId(id);
    setActiveMode(inferSessionMode(session));
    navigate("/chat");
  };

  const handleModeChange = (mode) => {
    const existing = getLastSessionForMode(sessions, mode);
    if (existing) {
      setActiveMode(mode);
      setActiveId(existing.id);
      return;
    }

    const newChat = createChatSession(mode);
    setSessions((prev) => [...prev, newChat]);
    setActiveMode(mode);
    setActiveId(newChat.id);
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this chat permanently?")) return;
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (activeId === id) {
      const fallback = getLastSessionForMode(next, activeMode) || next[0] || null;
      setActiveId(fallback?.id || "");
      setActiveMode(inferSessionMode(fallback));
    }
    try {
      await fetch(`${API_BASE}/api/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    } catch (err) {
      console.error("Failed to delete session from server:", err);
    }
  };
  
  // 🔥 FIXED: Prevent infinite re-renders by checking if messages actually changed
  const handleUpdateSession = (msgs) => {
    setSessions((prev) => {
      const currentSession = prev.find((s) => s.id === activeId);
      
      // Only update if messages actually changed
      if (currentSession && JSON.stringify(currentSession.messages) === JSON.stringify(msgs)) {
        return prev; // No change needed, return same reference
      }
      
      return prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              messages: msgs,
              title: msgs.length > 0 ? (msgs[0]?.text.slice(0, 30) || "New Chat") : "New Chat",
            }
          : s
      );
    });
  };

  // Pin/Unpin handler
  const handlePin = (id) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, pinned: !s.pinned } : s
      )
    );
  };

  // Archive handler
  const handleArchive = (id) => {
    const next = sessions.map((s) =>
      s.id === id ? { ...s, archived: !s.archived } : s
    );
    setSessions(next);
    if (id === activeId) {
      const remaining = next.filter((s) => !s.archived && s.id !== id);
      const fallback = getLastSessionForMode(remaining, activeMode) || remaining[0] || null;
      setActiveId(fallback?.id || "");
      setActiveMode(inferSessionMode(fallback));
    }
  };

  // Rename handler
  const handleRename = (id, newTitle) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, title: newTitle } : s
      )
    );
  };

  // Sidebar toggle function
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  // Theme toggle function
  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  // logout
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("chat_sessions");
    // Clear UI and reset to a fresh chat
    const freshSession = createChatSession(DEFAULT_CHAT_MODE);
    setSessions([freshSession]);
    setActiveMode(DEFAULT_CHAT_MODE);
    setActiveId(freshSession.id);
    navigate("/chat", { replace: true });
  };

  // Extract user email from token
  const userEmail = token ? (parseJwt(token).email || parseJwt(token).sub || "User") : "";

  return (
    <>
      <Toaster position="top-center" richColors />
      {/* WelcomeModal removed */}
      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        onNewChat={handleNew}
        onToggleTheme={toggleTheme}
        onNavigate={navigate}
        role={role}
        darkMode={darkMode}
      />
      <NavBar
        role={role}
        onLogout={handleLogout}
        onToggleSidebar={toggleSidebar}
      />

      <Routes>
        {/* public */}
        <Route
          path="/signup"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/login"
          element={token ? <Navigate to="/chat" replace /> : <Login onLoggedIn={setToken} />}
        />

        <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
        <Route path="/reset-password" element={<Navigate to="/login" replace />} />

        {/* public: guest trial chat */}
        <Route
          path="/trychat"
          element={<LandingPage />}
        />

        {/* root redirects to /trychat or /chat based on auth */}
        <Route
          path="/"
          element={token ? <Navigate to="/chat" replace /> : <LandingPage />}
        />

        {/* protected: chat */}
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <ChatLayout
                sessions={sessions}
                activeId={activeId}
                activeMode={activeMode}
                onNew={handleNew}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onSessionChange={handleUpdateSession}
                onModeChange={handleModeChange}
                onLogout={handleLogout}
                userEmail={userEmail}
                onPin={handlePin}
                onArchive={handleArchive}
                onRename={handleRename}
                darkMode={darkMode}
                onToggleTheme={toggleTheme}
                onCollapse={toggleSidebar}
              />
            </RequireAuth>
          }
        />

        {/* protected: my classes with sidebar */}
        <Route
          path="/my-classes"
          element={
            <RequireAuth>
              <SidebarLayout
                sessions={sessions}
                activeId={activeId}
                onNew={handleNew}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onLogout={handleLogout}
                userEmail={userEmail}
                onPin={handlePin}
                onArchive={handleArchive}
                onRename={handleRename}
                darkMode={darkMode}
                onToggleTheme={toggleTheme}
                onCollapse={toggleSidebar}
              >
                <MyClassesPage />
              </SidebarLayout>
            </RequireAuth>
          }
        />

        {/* protected: grade surgeon with sidebar */}
        <Route
          path="/grade-analysis"
          element={
            <RequireAuth>
              <SidebarLayout
                sessions={sessions}
                activeId={activeId}
                onNew={handleNew}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onLogout={handleLogout}
                userEmail={userEmail}
                onPin={handlePin}
                onArchive={handleArchive}
                onRename={handleRename}
                darkMode={darkMode}
                onToggleTheme={toggleTheme}
                onCollapse={toggleSidebar}
              >
                <GradeSurgeon />
              </SidebarLayout>
            </RequireAuth>
          }
        />

        {/* protected: ripple effect with sidebar */}
        <Route
          path="/ripple-effect"
          element={
            <RequireAuth>
              <SidebarLayout
                sessions={sessions}
                activeId={activeId}
                onNew={handleNew}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onLogout={handleLogout}
                userEmail={userEmail}
                onPin={handlePin}
                onArchive={handleArchive}
                onRename={handleRename}
                darkMode={darkMode}
                onToggleTheme={toggleTheme}
                onCollapse={toggleSidebar}
              >
                <RippleEffect />
              </SidebarLayout>
            </RequireAuth>
          }
        />

        {/* protected: curriculum with sidebar */}
        <Route
          path="/curriculum"
          element={
            <RequireAuth>
              <SidebarLayout
                sessions={sessions}
                activeId={activeId}
                onNew={handleNew}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onLogout={handleLogout}
                userEmail={userEmail}
                onPin={handlePin}
                onArchive={handleArchive}
                onRename={handleRename}
                darkMode={darkMode}
                onToggleTheme={toggleTheme}
                onCollapse={toggleSidebar}
              >
                <CurriculumPage />
              </SidebarLayout>
            </RequireAuth>
          }
        />

        {/* 🔥 NEW: protected profile page with sidebar */}
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <SidebarLayout
                sessions={sessions}
                activeId={activeId}
                onNew={handleNew}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onLogout={handleLogout}
                userEmail={userEmail}
                onPin={handlePin}
                onArchive={handleArchive}
                onRename={handleRename}
                darkMode={darkMode}
                onToggleTheme={toggleTheme}
                onCollapse={toggleSidebar}
              >
                <ProfilePage userEmail={userEmail} onLogout={handleLogout} />
              </SidebarLayout>
            </RequireAuth>
          }
        />

        {/* protected: admin */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              {role === "admin" ? <AdminDashboard /> : <Forbidden />}
            </RequireAuth>
          }
        />

        {/* fallback */}
        <Route
          path="*"
          element={<Navigate to={token ? "/chat" : "/"} replace />}
        />
      </Routes>
    </>
  );
}
