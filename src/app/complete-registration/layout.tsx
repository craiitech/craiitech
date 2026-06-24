export default function CompleteRegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 lg:p-0">
      <style>{`
        @keyframes kenBurnsBackground {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.08) translate(-0.5%, -0.5%); }
          100% { transform: scale(1) translate(0, 0); }
        }
        @keyframes float-slow-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.08); }
        }
        @keyframes float-slow-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
        }
      `}</style>

      {/* Background Layer with Animation and Abstract Dark Space */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-slate-950 overflow-hidden">
        {/* Animated Campus Photo (rsupage.png) */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: "url('/rsupage.png')",
            opacity: 0.38,
            animation: "kenBurnsBackground 45s ease-in-out infinite",
          }}
        />
        {/* Abstract Dark Tint Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-[#0a1e12]/95 backdrop-blur-[1px]" />
        
        {/* Luminous Animated Glow Blobs */}
        <div 
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] pointer-events-none"
          style={{ animation: 'float-slow-1 15s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none"
          style={{ animation: 'float-slow-2 18s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-10 flex w-full items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
