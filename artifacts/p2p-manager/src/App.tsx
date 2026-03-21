import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import OperationsList from "@/pages/operations/index";
import OperationForm from "@/pages/operations/form";
import Distribution from "@/pages/distribution/index";
import Reports from "@/pages/reports/index";
import Settings from "@/pages/settings/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, roles = ["admin", "socio"] }: { component: any, roles?: string[] }) {
  const { token, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }
  
  if (!token) {
    return <Redirect to="/login" />;
  }

  if (user && !roles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/operaciones/nueva">
        <ProtectedRoute component={OperationForm} />
      </Route>
      
      <Route path="/operaciones">
        <ProtectedRoute component={OperationsList} />
      </Route>
      
      <Route path="/distribucion">
        <ProtectedRoute component={Distribution} roles={["admin"]} />
      </Route>
      
      <Route path="/reportes">
        <ProtectedRoute component={Reports} />
      </Route>
      
      <Route path="/configuracion">
        <ProtectedRoute component={Settings} roles={["admin"]} />
      </Route>

      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      <Route>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-display font-bold text-primary mb-2">404</h1>
          <p className="text-muted-foreground mb-6">La página que buscas no existe.</p>
          <a href="/dashboard" className="px-6 py-2 bg-primary text-white rounded-xl">Volver al inicio</a>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
