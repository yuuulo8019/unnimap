const VERDICT_MAP = {
  best:  "💕 여기로 와!",
  good:  "🌸 언니 여기 괜찮아",
  mid:   "👌 써도 돼",
  bad:   "🥲 급하면...",
  worst: "🫠 전 가게 들렸지?",
};

export default function SuccessModal({ rating, onClose }) {
  const verdict = VERDICT_MAP[rating];

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(255,240,245,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9998, padding: 24,
      fontFamily: "inherit",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20,
        padding: "48px 32px 36px",
        width: "100%", maxWidth: 360,
        textAlign: "center",
        boxShadow: "0 8px 40px rgba(255,107,157,0.18)",
      }}>
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }}>✨</div>

        <div style={{
          fontSize: 22, fontWeight: 900,
          color: "#FF6B9D", marginBottom: verdict ? 16 : 14,
          letterSpacing: "-0.5px",
        }}>
          올려줘서 고마워 언니!
        </div>

        {verdict && (
          <div style={{
            display: "inline-block",
            background: "#FFF0F5",
            borderRadius: 24,
            padding: "10px 20px",
            fontSize: 22,
            fontWeight: 800,
            color: "#FF6B9D",
            marginBottom: 16,
            letterSpacing: "-0.3px",
          }}>
            {verdict}
          </div>
        )}

        <div style={{
          fontSize: 15, color: "#666",
          lineHeight: 1.8, marginBottom: 32,
          whiteSpace: "pre-line",
        }}>
          {"지금 이 순간 화장실 찾는\n언니들한테 큰 도움이 됐어. 🌸"}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "15px 0",
            background: "#FF6B9D", color: "#fff",
            border: "none", borderRadius: 12,
            fontSize: 16, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
