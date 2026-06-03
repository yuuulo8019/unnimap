export default function SuccessModal({ onClose }) {
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
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 20 }}>✨</div>
        <div style={{
          fontSize: 22, fontWeight: 900,
          color: "#FF6B9D", marginBottom: 14,
          letterSpacing: "-0.5px",
        }}>
          올려줘서 고마워 언니!
        </div>
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
