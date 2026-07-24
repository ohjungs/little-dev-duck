// 애니메이션 오리 로고 — SVG+CSS(외부 툴/에셋 불필요). 로그인·앱 좌상단 공용.
// intro=true면 마운트 시 한 번 "꽥"(부리 벌림+머리 들썩, MGM 사자 포효의 오리 버전) 연출.
// hover 시에도 꽥 반응. 순수 CSS라 hook/JS 없이 어디서든 동작하며 reduced-motion을 준수한다.

type DuckLogoProps = {
  size?: number;
  intro?: boolean;
  className?: string;
};

export function DuckLogo({ size = 40, intro = false, className }: DuckLogoProps) {
  return (
    <span
      className={`ldd-logo ${intro ? "ldd-logo--intro" : ""} ${className ?? ""}`}
      style={{ width: size, height: size, display: "inline-block", lineHeight: 0 }}
      aria-hidden="true"
    >
      <style>{LOGO_CSS}</style>
      <svg viewBox="0 0 64 64" width={size} height={size} className="ldd-logo-svg">
        {/* 몸통 */}
        <ellipse cx="32" cy="42" rx="19" ry="16" className="ldd-logo-body" />
        {/* 날개 */}
        <ellipse cx="17" cy="42" rx="6" ry="9" className="ldd-logo-wing" />
        {/* 머리 */}
        <circle cx="32" cy="23" r="15" className="ldd-logo-head" />
        {/* 눈 */}
        <g className="ldd-logo-eyes">
          <circle cx="26" cy="21" r="2.6" className="ldd-logo-eye" />
          <circle cx="38" cy="21" r="2.6" className="ldd-logo-eye" />
          <circle cx="26.8" cy="20.2" r="0.9" className="ldd-logo-shine" />
          <circle cx="38.8" cy="20.2" r="0.9" className="ldd-logo-shine" />
        </g>
        {/* 부리(윗/아랫 — 꽥 시 아랫부리가 벌어짐) */}
        <g className="ldd-logo-beak">
          <path d="M23 28 h18 l-3 4 h-12 z" className="ldd-logo-beak-top" />
          <path d="M25 32 h14 l-2 3 h-10 z" className="ldd-logo-beak-bot" />
        </g>
        {/* 머리 깃털 */}
        <path d="M32 6 q-3 -5 1.5 -6 q4.5 -1 3 5 z" className="ldd-logo-tuft" />
      </svg>
    </span>
  );
}

const LOGO_CSS = `
.ldd-logo-svg{display:block;overflow:visible;}
.ldd-logo-body{fill:#FFD23F;}
.ldd-logo-head{fill:#FFDD55;}
.ldd-logo-wing{fill:#F5C518;}
.ldd-logo-tuft{fill:#F5C518;}
.ldd-logo-eye{fill:#2B2118;}
.ldd-logo-shine{fill:#fff;}
.ldd-logo-beak-top{fill:#F97316;}
.ldd-logo-beak-bot{fill:#EA580C;transform-origin:32px 32px;}
.ldd-logo-eyes{transform-origin:32px 21px;animation:lddLogoBlink 5s infinite;}
.ldd-logo-svg{transform-origin:32px 50px;}

/* hover 시 꽥 */
.ldd-logo:hover .ldd-logo-beak-bot{animation:lddLogoQuack .5s ease;}
.ldd-logo:hover .ldd-logo-svg{animation:lddLogoBob .5s ease;}

/* intro: 마운트 시 한 번 크게 꽥(사자 포효 오리판) */
.ldd-logo--intro .ldd-logo-beak-bot{animation:lddLogoQuackBig 1.1s ease .2s 1 both;}
.ldd-logo--intro .ldd-logo-svg{animation:lddLogoRoar 1.1s ease .2s 1 both;}

@keyframes lddLogoBlink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
@keyframes lddLogoQuack{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(3px) scaleY(1.9)}}
@keyframes lddLogoBob{0%,100%{transform:scale(1)}50%{transform:scale(1.06) translateY(-2px)}}
@keyframes lddLogoQuackBig{0%,100%{transform:translateY(0) scaleY(1)}35%,65%{transform:translateY(4px) scaleY(2.4)}}
@keyframes lddLogoRoar{0%{transform:scale(.7);opacity:0}20%{opacity:1}45%{transform:scale(1.14) translateY(-3px)}70%{transform:scale(1.02)}100%{transform:scale(1)}}

@media (prefers-reduced-motion: reduce){
  .ldd-logo-eyes,.ldd-logo:hover .ldd-logo-beak-bot,.ldd-logo:hover .ldd-logo-svg,
  .ldd-logo--intro .ldd-logo-beak-bot,.ldd-logo--intro .ldd-logo-svg{animation:none !important;}
}
`;
