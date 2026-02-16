import "./App.css";
import { ThemeProvider } from "./components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/app-layout";
import OverviewPage from "./pages/overview";
import ProjectsPage from "./pages/projects";
import ProjectDetailPage from "./pages/projects/track";
import LoginPage from "./pages/login";
import GitHubAuthPage from "./pages/auth/github";
import { APIKeyPage } from "./pages/apikey";
import { UserProvider } from "./components/user-provider";
import KubentPage from "./pages/kubent";
import { NotFoundPage } from "./pages/error";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <UserProvider>
          <Routes>
            <Route index element={<Navigate to="/login" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:name" element={<ProjectDetailPage />} />
              <Route path="/get_apikey" element={<APIKeyPage />} />
              <Route path="/kubent" element={<KubentPage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/github/callback" element={<GitHubAuthPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </UserProvider>
      </ThemeProvider>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}

export default App;
