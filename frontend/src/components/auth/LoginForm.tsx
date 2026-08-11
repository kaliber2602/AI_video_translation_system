import {
  Eye,
  Mail,
  Lock,
 
  Apple,
} from "lucide-react";
import { useNavigate } from "react-router-dom";


export default function LoginForm() {
const navigate = useNavigate();

  return (
    <div className="flex w-full justify-center px-14">

      <div className="w-full max-w-[430px]">

        {/* Logo Placeholder */}

        <div className="mb-10 flex justify-center">

          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
            LOGO
          </div>

        </div>

        {/* Title */}

        <h2 className="text-center text-4xl font-bold text-slate-900">
          Welcome Back
        </h2>

        <p className="mt-3 text-center text-slate-500">
          Sign in to continue to <span className="font-semibold">VidNova</span>
        </p>

        {/* Form */}

        <div className="mt-12 space-y-6">

          {/* Email */}

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <div className="flex h-14 items-center rounded-xl border border-slate-200 bg-white px-4 transition-all duration-200 focus-within:border-[#22C7A9] focus-within:ring-2 focus-within:ring-[#22C7A9]/20">

              <Mail
                size={20}
                className="text-slate-400"
              />

              <input
                type="email"
                placeholder="name@example.com"
                className="ml-3 flex-1 bg-transparent outline-none"
              />

            </div>

          </div>

          {/* Password */}

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <div className="flex h-14 items-center rounded-xl border border-slate-200 bg-white px-4 transition-all duration-200 focus-within:border-[#22C7A9] focus-within:ring-2 focus-within:ring-[#22C7A9]/20">

              <Lock
                size={20}
                className="text-slate-400"
              />

              <input
                type="password"
                placeholder="••••••••"
                className="ml-3 flex-1 bg-transparent outline-none"
              />

              <Eye
                size={18}
                className="cursor-pointer text-slate-400"
              />

            </div>

          </div>

          {/* Remember */}

          <div className="flex items-center justify-between text-sm">

            <label className="flex cursor-pointer items-center gap-2">

              <input
                type="checkbox"
                className="accent-[#22C7A9]"
              />

              Remember me

            </label>

            <button className="font-medium text-[#22C7A9] hover:underline">
              Forgot Password?
            </button>

          </div>

          {/* Sign In */}

          <button
            type="button"
            onClick={() => navigate("/workspace")}
            className="h-14 w-full rounded-xl bg-[#22C7A9] font-semibold text-white transition hover:bg-[#19b69a] active:scale-[.98]"
          >
            Sign In
          </button>

        </div>

        {/* Divider */}

        <div className="my-10 flex items-center gap-4">

          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-sm text-slate-400">
            Or continue with
          </span>

          <div className="h-px flex-1 bg-slate-200" />

        </div>

        {/* Social */}

        <div className="grid grid-cols-3 gap-4">

          {/* <button className="flex h-14 items-center justify-center rounded-xl border border-slate-200 transition hover:border-[#22C7A9] hover:bg-[#F7FFFD]">

            <Chrome />

          </button> */}

          <button className="flex h-14 items-center justify-center rounded-xl border border-slate-200 transition hover:border-[#22C7A9] hover:bg-[#F7FFFD]">

            Microsoft

          </button>

          <button className="flex h-14 items-center justify-center rounded-xl border border-slate-200 transition hover:border-[#22C7A9] hover:bg-[#F7FFFD]">

            <Apple />

          </button>

        </div>

        {/* Footer */}

        <p className="mt-10 text-center text-sm text-slate-500">

          Don't have an account?

          <button className="ml-2 font-semibold text-[#22C7A9] hover:underline">
            Create one
          </button>

        </p>

      </div>

    </div>
  );
}