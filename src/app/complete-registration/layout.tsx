export default function CompleteRegistrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 lg:p-0">
      {/* Static Campus Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-slate-950 overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('/rsupage.png')" }}
        />
        <div className="absolute inset-0 bg-slate-950/85" />
      </div>

      <div className="relative z-10 flex w-full items-center justify-center p-4">{children}</div>
    </div>
  );
}
