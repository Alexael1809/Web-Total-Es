import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  PieChart, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "socio"] },
    { name: "Operaciones", href: "/operaciones", icon: ArrowRightLeft, roles: ["admin", "socio"] },
    { name: "Distribución", href: "/distribucion", icon: PieChart, roles: ["admin"] },
    { name: "Reportes", href: "/reportes", icon: FileText, roles: ["admin", "socio"] },
    { name: "Configuración", href: "/configuracion", icon: Settings, roles: ["admin"] },
  ];

  const allowedNavItems = navItems.filter(item => item.roles.includes(user?.role || ""));

  const NavLinks = () => (
    <>
      {allowedNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className="block">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
              isActive 
                ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,165,255,0.15)]" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}>
              <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "group-hover:text-foreground")} />
              <span className="font-medium">{item.name}</span>
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-success flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">P2P Manager</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-muted-foreground hover:text-foreground">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b border-border bg-card overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-2">
              <NavLinks />
              <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-colors mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-success flex items-center justify-center shadow-lg shadow-primary/20">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-gradient">P2P Manager</span>
        </div>

        <div className="px-4 py-2">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <UserIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground truncate max-w-[120px]">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-2">
          <NavLinks />
        </nav>

        <div className="p-4">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-colors group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 w-full max-w-[100vw] overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
