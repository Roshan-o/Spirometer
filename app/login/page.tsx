"use client";

import React, { useState } from "react";
import { Mail, Lock, EyeOff, Eye, ArrowRight, Loader2 } from "lucide-react";
import { login, signup } from "../actions/auth";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const response =
        activeTab === "login" ? await login(formData) : await signup(formData);

      if (response?.error) {
        setError(response.error);
      } else if (response?.success) {
        router.push("/dashboard"); // Redirect on success
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] flex flex-col md:flex-row items-center gap-12 lg:gap-24">
        
        {/* Left Side: Branding */}
        <div className="flex-1 text-center md:text-left mb-8 md:mb-0">
          <h1 className="text-5xl font-bold tracking-tight mb-2">
            <span className="text-[#0a1e3f]">Breath</span>
            <span className="text-[#00a884]">Note</span>
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Breathe Better. Live Better.
          </p>
        </div>

        {/* Right Side: Auth Card */}
        <div className="flex-1 w-full max-w-[440px]">
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
              <button
                onClick={() => { setActiveTab("login"); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === "login"
                    ? "text-[#1d64d8]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Login
                {activeTab === "login" && (
                  <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#1d64d8]" />
                )}
              </button>
              <button
                onClick={() => { setActiveTab("signup"); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === "signup"
                    ? "text-[#1d64d8]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Sign Up
                {activeTab === "signup" && (
                  <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#1d64d8]" />
                )}
              </button>
            </div>

            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#0a1e3f] mb-2">
                {activeTab === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-gray-500 text-sm">
                {activeTab === "login"
                  ? "Continue your breathing journey"
                  : "Start your breathing journey today"}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" action={handleSubmit}>
              
              {/* Optional Name Field for Sign Up */}
              {activeTab === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                         <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                    <input
                      type="text"
                      name="name"
                      required={activeTab === "signup"}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d64d8]/20 focus:border-[#1d64d8] transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-[18px] w-[18px] text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d64d8]/20 focus:border-[#1d64d8] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d64d8]/20 focus:border-[#1d64d8] transition-colors"
                    placeholder={activeTab === "login" ? "Enter your password" : "Create a strong password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <Eye className="h-[18px] w-[18px]" />
                    ) : (
                      <EyeOff className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
                
                {/* Forgot Password Link (Only on Login) */}
                {activeTab === "login" && (
                  <div className="flex justify-end pt-1">
                    <a
                      href="#"
                      className="text-xs font-medium text-[#1d64d8] hover:text-blue-800 transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-[#175cd3] hover:bg-[#124aab] text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {activeTab === "login" ? "Login" : "Sign Up"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
