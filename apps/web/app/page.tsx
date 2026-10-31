import Link from "next/link";
import { 
  ShieldCheck, 
  Crown, 
  Sliders, 
  Armchair, 
  QrCode, 
  Tv, 
  UserCircle, 
  Layers, 
  Sparkles, 
  ArrowRight 
} from "lucide-react";

export default function HomePage() {
  const panels = [
    {
      title: "1. Super Admin Platform",
      role: "Platform Operator",
      badge: "Global Oversight",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      description: "Manage all tenant salons, toggle rural vs modern modes, adjust subscription tiers, and monitor nationwide GMV volume.",
      href: "/admin",
      icon: ShieldCheck,
      color: "from-purple-500 to-indigo-600",
      demo: "admin / Admin@123",
    },
    {
      title: "2. Salon Owner Command Hub",
      role: "Salon Owner / Manager",
      badge: "Multi-Branch",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      description: "Multi-branch switcher, staff rosters, 4-digit mirror PIN assignment, emergency kill-switch, and rural flexible pricing.",
      href: "/owner",
      icon: Crown,
      color: "from-amber-500 to-orange-600",
      demo: "aura_owner / Aura@123",
    },
    {
      title: "3. Staff Preferences Portal",
      role: "Stylist / Barber",
      badge: "Speed Calibration",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      description: "Adjust personal haircut speed (15m–60m) to dynamically tune wait times, manage shift status, and change 4-digit PIN.",
      href: "/staff/preferences",
      icon: Sliders,
      color: "from-blue-500 to-cyan-600",
      demo: "ramesh / Ramesh@123",
    },
    {
      title: "4. Staff Chair Working Station",
      role: "Cutting Station / Mirror",
      badge: "4-Digit Quick PIN",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      description: "Touch numpad unlock (<200ms), 2-sec chair swap modal, currently serving box with live editable bill, and voice callout.",
      href: "/s/ramesh-barber/station",
      icon: Armchair,
      color: "from-emerald-500 to-teal-600",
      demo: "Ramesh PIN: 1234 | Leo PIN: 4321",
    },
    {
      title: "5A-1. Customer Door QR & Pocket Queue",
      role: "Guest / Walk-In Customer",
      badge: "Ultra-Light (<25KB)",
      badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      description: "Scan QR code outside, join in 3 secs, track personal ticket at top + full live salon queue board below while grabbing tea.",
      href: "/s/ramesh-barber",
      icon: QrCode,
      color: "from-sky-500 to-blue-600",
      demo: "Zero app download / No password required",
    },
    {
      title: "5A-2. Public Lobby TV Board",
      role: "Entire Salon Lounge",
      badge: "Big Screen Display",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      description: "High-contrast airport-style departure board for the whole salon lounge with privacy phone masking and continuous sockets.",
      href: "/s/ramesh-barber/tv",
      icon: Tv,
      color: "from-rose-500 to-pink-600",
      demo: "Wall-mounted Smart TV Display",
    },
    {
      title: "5B. Customer Account & History Portal",
      role: "Registered Customer",
      badge: "Member Portal",
      badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      description: "Saved haircut specifications & trimmer notes, complete visit history, digital tax receipts, and loyalty reward stamps.",
      href: "/me",
      icon: UserCircle,
      color: "from-teal-500 to-emerald-600",
      demo: "Customer Loyalty & Haircut Specs",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full pt-6 pb-12 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-slate-800">
        <div>
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white shadow-lg shadow-sky-500/20">
              <Layers className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Engine Que System
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              v2.0 Next.js 15
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
            Enterprise high-concurrency queue engine and multi-panel operational suite for rural solo-barbers and modern multi-station salons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-400">Backend Engine</div>
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Bun v1.4 + ElysiaJS (Port 3001)
            </div>
          </div>
        </div>
      </header>

      {/* Panels Grid */}
      <section className="max-w-6xl mx-auto w-full py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              Operational Frontend Panels
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Select any panel to inspect its dedicated interface, role permissions, and live queue interactions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {panels.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Link
                key={idx}
                href={p.href}
                className="group relative bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-tr ${p.color} text-white shadow-md`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold group-hover:text-sky-400 transition-colors mb-1.5">
                    {p.title}
                  </h3>
                  <div className="text-xs font-medium text-slate-400 mb-3">
                    Role: <span className="text-slate-300">{p.role}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {p.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[190px]">
                    {p.demo}
                  </span>
                  <span className="inline-flex items-center text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
                    Launch <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-8 pb-4 border-t border-slate-800 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
        <div>
          Engine Que System &copy; 2026. Enterprise Decoupled Monorepo Architecture.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/swagger" className="hover:text-slate-300 transition-colors">
            Swagger API Docs
          </Link>
          <span>&bull;</span>
          <span className="text-emerald-400 font-medium">Dual-Mode: Rural Solo & Modern Multi</span>
        </div>
      </footer>
    </main>
  );
}
