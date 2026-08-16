import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PrivateRoute } from '../components/PrivateRoute';
import { PublicRoute } from '../components/PublicRoute';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ConfirmEmailPage } from '../pages/ConfirmEmailPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { GamePage } from '../pages/GamePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes (redirect to dashboard if authenticated) */}
        <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

        {/* Public route without redirect (accessible by all) */}
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />

        {/* Private routes (redirect to login if not authenticated) */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/game" element={<PrivateRoute><GamePage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
