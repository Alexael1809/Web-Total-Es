import React, { useState } from "react";
import { 
  useGetUsers, useCreateUser, useDeleteUser,
  useGetPaymentMethods, useCreatePaymentMethod, useDeletePaymentMethod 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus, CreditCard, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "payments">("users");

  const { data: users } = useGetUsers();
  const { data: paymentMethods } = useGetPaymentMethods();

  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUser();
  const createPaymentMutation = useCreatePaymentMethod();
  const deletePaymentMutation = useDeletePaymentMethod();

  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "socio" as "socio"|"admin" });
  const [newMethod, setNewMethod] = useState("");

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-danger mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-foreground">Acceso Denegado</h2>
        <p className="text-muted-foreground mt-2">Solo los administradores pueden acceder a la configuración.</p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUserMutation.mutateAsync({ data: newUser });
    setNewUser({ name: "", email: "", password: "", role: "socio" });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
  };

  const handleCreateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPaymentMutation.mutateAsync({ data: { name: newMethod } });
    setNewMethod("");
    queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm("Eliminar usuario?")) {
      await deleteUserMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    }
  };

  const handleDeleteMethod = async (id: number) => {
    if (confirm("Eliminar método de pago?")) {
      await deletePaymentMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">Administra accesos y parámetros del sistema.</p>
      </div>

      <div className="flex gap-4 border-b border-border pb-2">
        <button 
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === "users" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Usuarios y Socios
        </button>
        <button 
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === "payments" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Métodos de Pago
        </button>
      </div>

      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Nuevo Usuario</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input type="text" placeholder="Nombre" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                <input type="email" placeholder="Email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                <input type="password" placeholder="Contraseña" required minLength={6} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as "admin"|"socio"})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none">
                  <option value="socio">Socio (Solo Lectura)</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="submit" disabled={createUserMutation.isPending} className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-xl transition-all">Crear Usuario</button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="glass-panel rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-border">
                    <th className="px-6 py-4 font-medium">Nombre</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Rol</th>
                    <th className="px-6 py-4 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users?.map(u => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 font-medium">{u.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>{u.role.toUpperCase()}</span></td>
                      <td className="px-6 py-4 text-right">
                        {u.id !== currentUser?.id && (
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Agregar Método</h3>
              <form onSubmit={handleCreateMethod} className="space-y-4">
                <input type="text" placeholder="Ej: Mercantil, Zinli, Facebank..." required value={newMethod} onChange={e => setNewMethod(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
                <button type="submit" disabled={createPaymentMutation.isPending} className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-xl transition-all">Agregar</button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {paymentMethods?.map(pm => (
                <div key={pm.id} className="glass-panel p-4 rounded-xl flex items-center justify-between group border border-white/5 hover:border-primary/30 transition-colors">
                  <span className="font-medium text-foreground">{pm.name}</span>
                  <button onClick={() => handleDeleteMethod(pm.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
