import { useState } from "react";

const SLIDES = [
  {
    emoji: "🚻",
    title: "언니맵",
    body: "언니, 거기 말고 여기 가.\n급하다고 아무데나 가지 마.\n\n언니들이 직접 확인한\n깨끗한 화장실만 모았어.",
    bodySize: 15,
    lineHeight: 1.8,
  },
  {
    emoji: "👭",
    title: null,
    body: "언니가 먼저 다녀왔으니까.\n\n다음 언니는 고민 없이 갈 수 있게. 💕",
    bodySize: 17,
    lineHeight: 2.0,
  },
  {
    emoji: "🌸",
    title: null,
    body: "언니의 평가로\n더 꽤-끗해진 화장실!\n\n거기 화장실 어때?\n다른 언니들한테 알려줘!",
    bodySize: 15,
    lineHeight: 1.8,
  },
];

export default function OnboardingSlides({ onClose }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const goTo = (next) => {
    if (next === idx) return;
    setVisible(false);
    setTimeout(() => {
      setIdx(next);
      setVisible(true);
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
      position: "fixed", inset: 0,
      background: "linear-gradient(160deg, #fff 0%, #FFF0F5 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "24px",
      fontFamily: "inherit",
    }}>
      <div style={{
        width: "100%", maxWidth: 400,
        display: "flex", flexDirection: "column",
        alignItems: "center", flex: 1,
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 28 }}>
          {slide.emoji}
        </div>

        {slide.title && (
          <div style={{
            fontSize: 28, fontWeight: 900,
            color: "#FF6B9D", marginBottom: 20,
            letterSpacing: "-0.5px",
          }}>
            {slide.title}
          </div>
        )}

        <div style={{
          fontSize: slide.bodySize,
          color: "#666",
          lineHeight: slide.lineHeight,
          whiteSpace: "pre-line",
        }}>
          {slide.body}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === idx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: "none", padding: 0,
              cursor: "pointer",
              background: i === idx ? "#FF6B9D" : "#FFD6E7",
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
                fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              다시 보지 않기
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => goTo(idx + 1)}
              style={{
                background: "none", border: "none",
                color: "#FF6B9D", fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                padding: "10px 4px",
              }}
            >
              다음 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
