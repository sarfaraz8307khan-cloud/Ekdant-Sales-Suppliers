export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const tyreMark = (
    <svg viewBox="0 0 24 24" className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-8 bg-[#0f0a1f]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a]" />
      <div className="absolute inset-0 opacity-[0.15]">
        <div
          className="absolute w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(99,102,241,0.6) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(59,130,246,0.5) 0, transparent 40%), radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3) 0, transparent 60%)",
          }}
        />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full border-8 border-indigo-400/20 animate-[spin_30s_linear_infinite]">
          <div className="absolute inset-4 rounded-full border-4 border-indigo-300/20" />
        </div>
        <div className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full border-8 border-violet-400/20 animate-[spin_40s_linear_infinite_reverse]">
          <div className="absolute inset-5 rounded-full border-4 border-violet-300/15" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            {tyreMark}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Ekdant Sales & Suppliers
          </h1>
          <p className="text-indigo-200/80 text-sm mt-1 font-medium tracking-wide">
            {title}
          </p>
        </div>

        <div className="bg-surface/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 p-6 sm:p-8 animate-fade-in-up [animation-delay:100ms]">
          {children}
        </div>

        <p className="text-center text-indigo-200/50 text-xs mt-6 animate-fade-in-up [animation-delay:200ms]">
          © {new Date().getFullYear()} Ekdant Sales & Suppliers
        </p>
      </div>
    </div>
  );
}