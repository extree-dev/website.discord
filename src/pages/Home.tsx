/* Home.tsx
   Полнофункциональная страница-лендинг с:
   - многослойным параллаксом (far/mid/near)
   - "pinned" секциями (стадии) и скролл-контролируемыми timeline'ами
   - staged reveal внутри секций
   - прогресс-бар, reduced-motion, адаптивность
   - удобная структура (подкомпоненты)
*/

import React, { useEffect, useRef, useCallback } from "react";
import { FaDiscord } from "react-icons/fa";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../components/CSS/Home.css";

gsap.registerPlugin(ScrollTrigger);

/* ----------------------
   Конфигурация
   ---------------------- */
const CONFIG = {
  // parallax strengths (yPercent)
  parallax: { far: -8, mid: -18, near: -34 },
  // scrub smoothing (lower = more tightly tied to scroll)
  scrub: 0.6,
  // pin duration percentage (how long to pin each panel in relation to viewport)
  pinDuration: "100%", // we use +=100% in most timelines
  // staged reveal delays (ms)
  stagedDelayStep: 120,
  // matchMedia breakpoints
  breakpoints: {
    desktop: "(min-width: 992px)",
    mobile: "(max-width: 991px)",
  },
};

/* ----------------------
   Типы / помощники
   ---------------------- */
type PanelRef = HTMLDivElement | null;

function clamp(v: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

/* ----------------------
   Подкомпоненты: Panel — одна секция
   ---------------------- */
const Panel: React.FC<{
  className?: string;
  id?: string;
  children?: React.ReactNode;
  panelRef?: (el: HTMLDivElement | null) => void;
}> = ({ className = "", id, children, panelRef }) => {
  return (
    <section className={`panel ${className}`} id={id} ref={panelRef}>
      <div className="panel__wrap container">{children}</div>
    </section>
  );
};

/* ----------------------
   Main Home
   ---------------------- */
const Home: React.FC = () => {
  // refs for background layers
  const rootRef = useRef<HTMLDivElement | null>(null);
  const farRef = useRef<HTMLDivElement | null>(null);
  const midRef = useRef<HTMLDivElement | null>(null);
  const nearRef = useRef<HTMLDivElement | null>(null);

  // refs for panels
  const panelsRef = useRef<HTMLDivElement[]>([]);
  const addPanelRef = useCallback((el: HTMLDivElement | null) => {
    if (el && !panelsRef.current.includes(el)) panelsRef.current.push(el);
  }, []);

  // progress bar
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // effect: GSAP setup
  useEffect(() => {
    const mm = gsap.matchMedia();

    // Опишите интерфейс условий, которые вы передаёте в matchMedia
    type MMConditions = {
      isDesktop?: boolean;
      isMobile?: boolean;
      [key: string]: boolean | undefined;
    };

    // Контекст, который приходит в колбэк
    type MMContext = {
      conditions?: MMConditions;
      // GSAP может добавлять другие поля — позволим any для них
      [key: string]: any;
    };

    mm.add(
      {
        isDesktop: CONFIG.breakpoints.desktop,
        isMobile: CONFIG.breakpoints.mobile,
      },
      (context: unknown) => {
        // безопасно кастуем unknown → наш MMContext
        const ctx = context as MMContext;
        const isDesktop = Boolean(ctx.conditions?.isDesktop);
        const isMobile = Boolean(ctx.conditions?.isMobile);

        // --- Parallax background timeline ---
        const bgTL = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: rootRef.current!,
            start: "top top",
            end: "bottom bottom",
            scrub: CONFIG.scrub,
          },
        });

        bgTL
          .to(farRef.current, { yPercent: CONFIG.parallax.far }, 0)
          .to(midRef.current, { yPercent: CONFIG.parallax.mid }, 0)
          .to(nearRef.current, { yPercent: CONFIG.parallax.near }, 0);

        // --- Panels animations ---
        if (isDesktop) {
          panelsRef.current.forEach((panel, index) => {
            const title = panel.querySelector<HTMLElement>(".panel__title");
            const subtitle = panel.querySelector<HTMLElement>(".panel__subtitle");
            const body = panel.querySelector<HTMLElement>(".panel__body");
            const cta = panel.querySelector<HTMLElement>(".panel__cta");
            const deco = panel.querySelector<HTMLElement>(".panel__deco");

            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: panel,
                start: "top top",
                end: `+=${panel.offsetHeight || window.innerHeight}`,
                scrub: CONFIG.scrub,
                pin: true,
                anticipatePin: 1,
                onUpdate: (self) => {
                  if (progressBarRef.current) {
                    const progress = Math.max(0, Math.min(1, self.progress));
                    progressBarRef.current.style.height = `${progress * 100}%`;
                  }
                },
              },
            });

            if (title) tl.fromTo(title, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9 }, 0);
            if (subtitle) tl.fromTo(subtitle, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, 0.15);
            if (body) tl.fromTo(body, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, 0.3);
            if (cta) tl.fromTo(cta, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.5);
            if (deco) tl.to(deco, { yPercent: -6 }, 0);
          });
        } else {
          panelsRef.current.forEach((panel) => {
            gsap.fromTo(
              panel,
              { autoAlpha: 0, y: 20 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: panel,
                  start: "top 85%",
                  toggleActions: "play none none reverse",
                },
              }
            );
          });
        }

        // можно вернуть cleanup, но mm.revert() вызовем в основном cleanup
        return () => {
          /* nothing special here */
        };
      }
    );

    return () => {
      mm.revert(); // очищает созданные ScrollTrigger/timelines внутри matchMedia
    };
  }, []);


  /* ----------------------
     Discord login handler
     (simple client-side redirect — adapt to your auth flow)
     ---------------------- */
  const handleDiscordLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || "";
    const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI || window.location.origin;
    if (!clientId) {
      alert("Discord Client ID не сконфигурирован");
      return;
    }
    const url = new URL("https://discord.com/api/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify%20email%20guilds");
    window.location.href = url.toString();
  };

  /* ----------------------
     Render
     ---------------------- */
  return (
    <div className="home-root" ref={rootRef}>
      {/* Progress indicator */}
      <div className="scroll-progress" aria-hidden>
        <div className="scroll-progress__bar" ref={progressBarRef}></div>
      </div>

      {/* Background layers (images or gradients) */}
      <div className="bg-layer bg--far" ref={farRef} aria-hidden style={{
      }} />

      <div className="bg-layer bg--mid" ref={midRef} aria-hidden style={{
      }} />

      <div className="bg-layer bg--near" ref={nearRef} aria-hidden style={{
      }} />

      {/* =======================
          PANELS: 4 секции (Hero, Auth, Features, CTA)
         ======================= */}
      {/* HERO */}
      <Panel className="panel--hero" panelRef={addPanelRef} id="hero">
        <div className="panel__deco deco--hero" aria-hidden />
        <h1 className="panel__title">
          Sentinel <span className="panel__title--light">Dashboard</span>
        </h1>
        <p className="panel__subtitle">
          Moderation tools, analytics, and automation for healthy communities.
        </p>
        <div className="panel__body">
          <p className="lead">
            Удобная и мощная панель управления для модерации Discord-сообществ:
            от автоматических фильтров до детального аудита и интеграций.
          </p>
        </div>
        <div className="panel__cta">
          <button className="btn btn--primary" onClick={handleDiscordLogin}>
            <FaDiscord /> Login with Discord
          </button>
          <button className="btn btn--ghost" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}>
            Подробнее
          </button>
        </div>
      </Panel>

      {/* AUTH */}
      <Panel className="panel--auth" panelRef={addPanelRef} id="auth">
        <div className="panel__deco deco--card" aria-hidden />
        <h2 className="panel__title">Быстрая и безопасная авторизация</h2>
        <p className="panel__subtitle">OAuth2 вход через Discord с выбором прав и серверов.</p>

        <div className="panel__body auth-card">
          <div className="auth-left">
            <p className="hint">Надёжно • Прозрачно • Безопасно</p>
            <ul className="auth-features" aria-hidden>
              <li>Однокликовый вход</li>
              <li>Выбор серверов и ролей</li>
              <li>Автоматическая привязка настроек</li>
            </ul>
            <div style={{ marginTop: 14 }}>
              <button className="btn btn--primary" onClick={handleDiscordLogin}>
                <FaDiscord /> Подключиться
              </button>
            </div>
          </div>
          <div className="auth-right">
            <div className="card-preview card">Preview — UI snapshot</div>
          </div>
        </div>
      </Panel>

      {/* FEATURES */}
      <Panel className="panel--features" panelRef={addPanelRef} id="features">
        <h2 className="panel__title">Ключевые возможности</h2>
        <p className="panel__subtitle">Мощная логика модерации, гибкие правила и аналитика.</p>

        <div className="panel__body feature-grid" role="list">
          {[
            "Автоматическая модерация",
            "Настраиваемые правила",
            "Дашборды и отчёты",
            "Интеграции / Webhooks",
            "Поддержка ролей и прав",
            "Аудит и экспорт логов",
          ].map((t, i) => (
            <div key={t} className="feature-card staged" style={{
              transitionDelay: `${CONFIG.stagedDelayStep}ms`
            }}
              role="listitem">
              {t}
            </div>
          ))}
        </div>
      </Panel>

      {/* CTA */}
      <Panel className="panel--cta" panelRef={addPanelRef} id="cta">
        <h2 className="panel__title">Готовы начать?</h2>
        <p className="panel__subtitle">Попробуйте бесплатно — настройте и масштабируйте сообщество без лишней рутины.</p>
        <div className="panel__cta">
          <button className="btn btn--ghost" onClick={() => window.open("/docs", "_self")}>Документация</button>
        </div>
        <footer className="panel__footer">
        </footer>
      </Panel>
    </div>
  );
};

export default Home;
