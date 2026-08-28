import { useEffect, useState } from 'react';
import { Download, ShieldCheck, Zap, Smartphone, Trophy, Bell, Ticket } from 'lucide-react';
import API from '../api/axios';

// Local fallback APK served from Vercel static if admin hasn't set androidUrl
const FALLBACK_APK = '/app-release.apk';

export default function DownloadAppSection() {
  const [settings, setSettings] = useState({});
  const [version, setVersion] = useState(null);

  useEffect(() => {
    API.get('/site/settings').then(({ data }) => setSettings(data)).catch(() => {});
    // version check is optional — ignore failures
    fetch(`${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:5000'}/api/version/check`)
      .then((r) => r.json())
      .then((d) => setVersion(d))
      .catch(() => {});
  }, []);

  const androidUrl = settings.androidUrl || FALLBACK_APK;
  const isExternal = /^https?:\/\//i.test(androidUrl);
  const hasDirectApk = androidUrl === FALLBACK_APK || androidUrl.endsWith('.apk');

  return (
    <section
      id="download-app"
      aria-labelledby="download-app-heading"
      className="py-20 px-4 sm:py-24"
    >
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-[32px] border border-black/5 dark:border-white/10 bg-white dark:bg-[#0a0a0a]">
          {/* glow */}
          <div className="absolute -top-40 -right-40 h-[560px] w-[560px] rounded-full bg-green-400/10 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-green-400/5 blur-[80px] pointer-events-none" />

          <div className="relative grid gap-10 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-10 lg:p-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-green-500">
                <Smartphone size={14} /> Get the app
              </div>
              <h2
                id="download-app-heading"
                className="font-bebas mt-4 text-4xl leading-none tracking-wide text-gray-900 dark:text-white md:text-6xl"
              >
                PLAY FASTER <span className="text-green-400">ON ANDROID</span>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                Book grounds in seconds, get challenge alerts, and carry your tickets offline. Light, fast, built for campus and city players.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Zap, label: 'Instant booking', sub: 'Tickets in one tap' },
                  { icon: Bell, label: 'Challenge alerts', sub: 'Never miss a match' },
                  { icon: Ticket, label: 'Offline tickets', sub: 'QR works without net' },
                  { icon: Trophy, label: 'Live updates', sub: 'Scores & streams' },
                ].map(({ icon: Icon, label, sub }) => (
                  <li key={label} className="flex gap-3 rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.03] p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-400/15 text-green-500 border border-green-400/20">
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
                      <span className="text-xs text-gray-500">{sub}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={androidUrl}
                  download={!isExternal && hasDirectApk ? 'SpotNPlay.apk' : undefined}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 rounded-2xl bg-green-400 px-6 py-3.5 text-sm font-black text-black hover:bg-green-300 transition"
                  aria-label="Download SpotNPlay Android APK"
                >
                  <Download size={18} /> Download APK
                </a>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-green-500" /> Free · No signup needed to download
                </span>
                {version?.latestVersionCode && (
                  <span className="rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-2.5 py-1">
                    v{version.latestVersionCode} · {version.latestVersionName || ''}
                  </span>
                )}
                <span className="rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-2.5 py-1">~24 MB · Android 8.0+</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                By downloading you agree to our <a href="/info#terms-and-conditions" className="underline hover:text-green-500">Terms</a> and <a href="/info#privacy-policy" className="underline hover:text-green-500">Privacy Policy</a>.
              </p>
            </div>

            {/* Right: Phone mock only */}
            <div className="relative flex flex-col items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-[36px] bg-green-400/20 blur-2xl" />
                <div className="relative mx-auto w-[220px] rounded-[32px] border-[8px] border-black dark:border-[#1a1a1a] bg-black p-2 shadow-2xl">
                  <div className="rounded-[22px] bg-gradient-to-b from-[#0a0a0a] to-[#101010] p-5 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-400 text-black font-black text-xl">S</div>
                    <p className="font-bebas mt-3 text-xl tracking-wide text-white">SPOTNPLAY</p>
                    <p className="text-xs text-gray-400">Your sports community</p>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                      <span className="rounded-xl bg-white/5 border border-white/10 py-2 text-white">Book Ground</span>
                      <span className="rounded-xl bg-green-400 py-2 font-bold text-black">Find Players</span>
                      <span className="rounded-xl bg-white/5 border border-white/10 py-2 text-white">Events</span>
                      <span className="rounded-xl bg-white/5 border border-white/10 py-2 text-white">Challenges</span>
                    </div>
                  </div>
                  {/* notch */}
                  <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
