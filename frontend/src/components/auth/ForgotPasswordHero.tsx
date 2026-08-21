import { MailCheck } from "lucide-react";
export default function ForgotPasswordHero() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#f7fcfc] via-[#effcf9] to-[#e5faf5] lg:flex lg:w-[46%]">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#22c7a9]/10" />

      <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#22c7a9]/10" />

      <div className="relative z-10 flex w-full flex-col justify-between p-12">
        <div>
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c7a9] text-white shadow-lg shadow-[#22c7a9]/20">
            <MailCheck size={24} />
          </div>

          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-slate-900">
            Recover your account securely.
          </h2>

          <p className="mt-5 max-w-md text-base leading-7 text-slate-500">
            We will send a verification code to your email
            address so you can safely reset your password.
          </p>
        </div>

        <p className="text-sm text-slate-400">
          Secure account recovery powered by VIDNOVA.
        </p>
      </div>
    </div>
  );
}