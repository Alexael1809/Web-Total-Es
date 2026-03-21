import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRightLeft, Lock, Mail, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");
  const loginMutation = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    setErrorMsg("");
    try {
      const res = await loginMutation.mutateAsync({ data });
      login(res.token, res.user);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al iniciar sesión. Verifica tus credenciales.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 translate-x-[-20%] translate-y-[-20%] w-[600px] h-[600px] bg-success/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 md:p-12 rounded-3xl relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-success flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
              <ArrowRightLeft className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Bienvenido</h1>
            <p className="text-muted-foreground">Ingresa a tu panel de control P2P</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Correo electrónico"
                />
              </div>
              {errors.email && <p className="text-danger text-sm mt-1 ml-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register("password")}
                  type="password"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Contraseña"
                />
              </div>
              {errors.password && <p className="text-danger text-sm mt-1 ml-1">{errors.password.message}</p>}
            </div>

            {errorMsg && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,165,255,0.3)] hover:shadow-[0_0_25px_rgba(0,165,255,0.5)] transition-all flex justify-center items-center gap-2 mt-4"
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Ingresando...</>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
