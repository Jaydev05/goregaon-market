/** Animates a product thumbnail flying into the visible cart icon, then bumps the icon. */
export function flyToCart(from: Element | null | undefined, image?: string) {
  if (typeof window === "undefined") return;
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).filter((el) => el.getClientRects().length > 0);
  const target = targets[targets.length - 1];
  if (!target) return;
  const bump = () => {
    target.classList.remove("cart-bump");
    void target.offsetWidth;
    target.classList.add("cart-bump");
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!from || reduce) return bump();
  const s = from.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const size = Math.min(72, Math.max(44, s.width * 0.5));
  const dot = document.createElement("div");
  dot.className = "pointer-events-none fixed z-[100] rounded-full border-2 border-card bg-primary bg-cover bg-center shadow-float";
  Object.assign(dot.style, {
    width: `${size}px`, height: `${size}px`,
    left: `${s.left + s.width / 2 - size / 2}px`, top: `${s.top + s.height / 2 - size / 2}px`,
    backgroundImage: image ? `url("${image}")` : "",
  });
  document.body.appendChild(dot);
  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);
  const anim = dot.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 110}px) scale(0.85) rotate(-12deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0.4 },
    ],
    { duration: 750, easing: "cubic-bezier(.55,0,.35,1)" },
  );
  anim.onfinish = () => { dot.remove(); bump(); };
}
