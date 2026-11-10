import { createBrowserRouter, Link } from 'react-router';
import React, { lazy, Suspense } from 'react';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#202124]">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-[#e8eaed] mb-2">Page Not Found</h1>
      <p className="text-gray-500 dark:text-[#9aa0a6] mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="bg-[#0a66c2] hover:bg-[#004182] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
        Back to Home
      </Link>
    </div>
  );
}

const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const Pricing = lazy(() => import('./pages/Pricing'));
const About = lazy(() => import('./pages/About'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const OnboardingLayout = lazy(() => import('./pages/onboarding/OnboardingLayout'));
const OnboardingStep1 = lazy(() => import('./pages/onboarding/Step1'));
const OnboardingStep2 = lazy(() => import('./pages/onboarding/Step2'));
const OnboardingStep3 = lazy(() => import('./pages/onboarding/Step3'));
const OnboardingStep4 = lazy(() => import('./pages/onboarding/Step4'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const ContactsList = lazy(() => import('./pages/contacts/ContactsList'));
const ContactProfile = lazy(() => import('./pages/contacts/ContactProfile'));
const CampaignsList = lazy(() => import('./pages/campaigns/CampaignsList'));
const CampaignDetail = lazy(() => import('./pages/campaigns/CampaignDetail'));
const CreateCampaign = lazy(() => import('./pages/campaigns/CreateCampaign'));
const Events = lazy(() => import('./pages/events/Events'));
const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const NetworkGraph = lazy(() => import('./pages/NetworkGraph'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Search = lazy(() => import('./pages/Search'));
const Help = lazy(() => import('./pages/Help'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/how-it-works',
    element: <Wrap><HowItWorks /></Wrap>,
  },
  {
    path: '/pricing',
    element: <Wrap><Pricing /></Wrap>,
  },
  {
    path: '/about',
    element: <Wrap><About /></Wrap>,
  },
  {
    path: '/signup',
    element: <Wrap><SignUp /></Wrap>,
  },
  {
    path: '/signin',
    element: <Wrap><SignIn /></Wrap>,
  },
  {
    path: '/onboarding',
    element: <Wrap><OnboardingLayout /></Wrap>,
    children: [
      { path: 'step-1', element: <Wrap><OnboardingStep1 /></Wrap> },
      { path: 'step-2', element: <Wrap><OnboardingStep2 /></Wrap> },
      { path: 'step-3', element: <Wrap><OnboardingStep3 /></Wrap> },
      { path: 'step-4', element: <Wrap><OnboardingStep4 /></Wrap> },
    ],
  },
  {
    Component: AppLayout,
    children: [
      { path: '/dashboard', element: <Wrap><Dashboard /></Wrap> },
      { path: '/contacts', element: <Wrap><ContactsList /></Wrap> },
      { path: '/contacts/:id', element: <Wrap><ContactProfile /></Wrap> },
      { path: '/campaigns', element: <Wrap><CampaignsList /></Wrap> },
      { path: '/campaigns/new', element: <Wrap><CreateCampaign /></Wrap> },
      { path: '/campaigns/:id', element: <Wrap><CampaignDetail /></Wrap> },
      { path: '/events', element: <Wrap><Events /></Wrap> },
      { path: '/analytics', element: <Wrap><Analytics /></Wrap> },
      { path: '/network-graph', element: <Wrap><NetworkGraph /></Wrap> },
      { path: '/settings', element: <Wrap><Settings /></Wrap> },
      { path: '/notifications', element: <Wrap><Notifications /></Wrap> },
      { path: '/search', element: <Wrap><Search /></Wrap> },
      { path: '/help', element: <Wrap><Help /></Wrap> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);