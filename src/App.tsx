import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DepartureCalendar from './pages/DepartureCalendar';
import ToursManagement from './pages/ToursManagement';
import OrdersManagement from './pages/OrdersManagement';
import VisaProcessing from './pages/VisaProcessing';
import VisaOrders from './pages/VisaOrders';
import VisaServices from './pages/VisaServices';
import AccountingInvoice from './pages/AccountingInvoice';
import PaymentProposals from './pages/PaymentProposals';
import CustomersManagement from './pages/CustomersManagement';
import PassengersManagement from './pages/PassengersManagement';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ActivityLogs from './pages/ActivityLogs';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import TourMediaManagement from './pages/TourMediaManagement';
import { GuestPhotoUploadPage } from './pages/GuestPhotoUploadPage';
import MetaAdsAnalytics from './pages/MetaAdsAnalytics';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import EmployeesManagement from './pages/EmployeesManagement';
import MyDashboard from './pages/MyDashboard';
import DocsPage from './pages/DocsPage';
import TaxHandbook from './pages/TaxHandbook';
import { CRMProvider } from './context/CRMContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Auth />;
  }
  return <>{children}</>;
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const isRecoveryInUrl = typeof window !== 'undefined' && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'));

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const guestTourId = searchParams.get('uploadTourId') || searchParams.get('tourId');
  const isGuestUploadRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/guest-upload' ||
    searchParams.has('uploadTourId') ||
    searchParams.has('tourId')
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">Đang tải...</div>;
  }

  // If unauthenticated guest accesses via QR code / quick link with uploadTourId, open guest upload page directly without login!
  if (!user && (guestTourId || isGuestUploadRoute)) {
    return (
      <CRMProvider initialRole="tour_guide">
        <GuestPhotoUploadPage defaultTourId={guestTourId || undefined} />
      </CRMProvider>
    );
  }

  if (isRecoveryInUrl) {
    return <Auth initialIsUpdatePassword={isRecoveryInUrl} />;
  }

  return (
    <CRMProvider initialRole={profile?.role || 'agent'}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<DepartureCalendar />} />
            <Route path="/docs" element={<ProtectedRoute><DocsPage /></ProtectedRoute>} />
            <Route path="/login" element={<Auth />} />
            <Route path="/guest-upload" element={<GuestPhotoUploadPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tours" element={<ProtectedRoute><ToursManagement /></ProtectedRoute>} />
            <Route path="/tour-media" element={<ProtectedRoute><TourMediaManagement /></ProtectedRoute>} />
            <Route path="/visa-services" element={<ProtectedRoute><VisaServices /></ProtectedRoute>} />
            <Route path="/visa-orders" element={<ProtectedRoute><VisaOrders /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrdersManagement /></ProtectedRoute>} />
            <Route path="/visa" element={<ProtectedRoute><VisaProcessing /></ProtectedRoute>} />
            <Route path="/accounting" element={<ProtectedRoute><AccountingInvoice /></ProtectedRoute>} />
            <Route path="/tax-handbook" element={<ProtectedRoute><TaxHandbook /></ProtectedRoute>} />
            <Route path="/payment-proposals" element={<ProtectedRoute><PaymentProposals /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><CustomersManagement /></ProtectedRoute>} />
            <Route path="/passengers" element={<ProtectedRoute><PassengersManagement /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/my-dashboard" element={<ProtectedRoute><MyDashboard /></ProtectedRoute>} />
            <Route path="/meta-ads" element={<ProtectedRoute><MetaAdsAnalytics /></ProtectedRoute>} />
            <Route path="/leave-requests" element={<ProtectedRoute><LeaveRequestsPage /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><EmployeesManagement /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/activity-logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
            <Route path="*" element={<DepartureCalendar />} />
          </Routes>
        </Layout>
      </Router>
    </CRMProvider>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
