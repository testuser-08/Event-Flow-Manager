import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from '@/pages/login';
import ChannelsList from '@/pages/channels';
import ChannelDetail from '@/pages/channel';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminRoster from '@/pages/admin/roster';
import Agenda from '@/pages/agenda';
import Breakouts from '@/pages/breakouts';
import Header from '@/components/shared/Header';
import WelcomeModal from '@/components/WelcomeModal';
import InstallPrompt from '@/components/shared/InstallPrompt';
import { useSetupDatabase } from '@workspace/api-client-react';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { volunteer, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-mono">LOADING...</div>;
  }

  if (!volunteer) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/channels" />;
  }

  return <Component {...rest} />;
}

function SetupTrigger() {
  const setup = useSetupDatabase();
  useEffect(() => {
    setup.mutate();
  }, []);
  return null;
}

function Router() {
  const { volunteer } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-md mx-auto sm:max-w-xl md:max-w-2xl bg-background border-x-2 border-border shadow-2xl relative">
      <SetupTrigger />
      <WelcomeModal />
      <InstallPrompt />
      {volunteer && <Header />}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Switch>
          <Route path="/login" component={Login} />

          <Route path="/" component={() => <Redirect to="/channels" />} />
          <Route path="/channels">
            {(params) => <ProtectedRoute component={ChannelsList} {...params} />}
          </Route>
          <Route path="/channels/:slug">
            {(params) => <ProtectedRoute component={ChannelDetail} {...params} />}
          </Route>

          <Route path="/agenda">
            {(params) => <ProtectedRoute component={Agenda} {...params} />}
          </Route>
          <Route path="/breakouts">
            {(params) => <ProtectedRoute component={Breakouts} {...params} />}
          </Route>

          <Route path="/admin">
            {(params) => <ProtectedRoute component={AdminDashboard} adminOnly {...params} />}
          </Route>
          <Route path="/admin/roster">
            {(params) => <ProtectedRoute component={AdminRoster} adminOnly {...params} />}
          </Route>

          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
