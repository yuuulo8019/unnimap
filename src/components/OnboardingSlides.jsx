import { useState } from "react";

const SLIDES = [
  {
    emoji: "🚻",
    title: "언니맵",
    titleSize: 28,
    body: "언니, 거기 말고 여기 가.\n급하다고 아무데나 가지 마.\n\n언니들이 직접 확인한\n깨끗한 화장실만 모았어.",
  },
  {
    emoji: "⭐",
    title: "별점 평균이 없어.",
    titleSize: 22,
    body: "어제 더러웠어도\n오늘 깨끗하면 추천받아.\n\n최신 평가 = 지금 이 순간 상태\n매일 청소하면 매일 인정받는 곳.",
  },
  {
    emoji: "🌸",
    title: "언니의 평가로",
    titleSize: 22,
    body: "더 꽤-끗해진 화장실!\n\n거기 화장실 어때?\n다른 언니들한테 알려줘!",
  },
];

export default function OnboardingSlides({ onClose }) {
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const goTo = (next) => {
    if (animating || next === idx) return;
    setAnimating(true);
    setFadeOut(true);
    setTimeout(() => {
      setIdx(next);
      setFadeOut(false);
      setTimeout(() => setAnimating(false), 300);
    }, 300);
  };

  const handleClose = (neverShow) => {
    if (neverShow) localStorage.setItem("unnimap_onboarding_seen", "true");
    onClose();
  };

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#FFF0F5",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "24px 24px 40px",
    }}>
      {/* Slide content */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        width: "100%", maxWidth: 400,
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.3s ease",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 56, marginBottom: 24, lineHeight: 1 }}>{slide.emoji}</div>
        <div style={{
          fontSize: slide.titleSize, fontWeight: 900,
          color: "#FF6B9D", marginBottom: 20,
          letterSpacing: "-0.5px", fontFamily: "inherit",
        }}>
          {slide.title}
        </div>
        <div style={{
          fontSize: 15, color: "#555", lineHeight: 1.7,
          whiteSpace: "pre-line", fontFamily: "inherit",
        }}>
          {slide.body}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === idx ? 20 : 8, height: 8,
              borderRadius: 4, border: "none", padding: 0, cursor: "pointer",
              background: i === idx ? "#FF6B9D" : "#FFCCE0",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ width: "100%", maxWidth: 400 }}>
        {isLast ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => handleClose(false)}
              style={{
                flex: 1, padding: "14px 0",
                background: "#FF6B9D", color: "#fff",
                border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              시작하기
            </button>
            <button
              onClick={() => handleClose(true)}
              style={{
                flex: 1, padding: "14px 0",
                background: "transparent", color: "#FF6B9D",
                border: "2px solid #FF6B9D", borderRadius: 12,
                fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              다시 보지 않기
            </button>
          </div>
        ) : (
          <button
            onClick={() => goTo(idx + 1)}
            style={{
              width: "100%", padding: "14px 0",
              background: "#FF6B9D", color: "#fff",
              border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            다음 →
          </button>
        )}
      </div>
    </div>
  );
}
