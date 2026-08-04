const WHATSAPP_NUMBER = "923269422411";

const WhatsAppButton = () => {
  const url = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <>
      <style>{`
        @keyframes waPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.5); }
          50%       { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
        }
        @keyframes waRing {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* Pulsing ring behind the button */}
      <div
        className="fixed bottom-6 right-6 z-40 pointer-events-none"
        style={{ width: 60, height: 60 }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(37,211,102,0.35)", animation: "waRing 2s ease-out infinite" }}
        />
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(37,211,102,0.2)", animation: "waRing 2s ease-out 0.7s infinite" }}
        />
      </div>

      {/* Main button */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95"
        style={{
          width: 60,
          height: 60,
          background: "linear-gradient(135deg,#25d366,#128c7e)",
          boxShadow: "0 4px 20px rgba(37,211,102,0.45)",
          animation: "waPulse 2.5s ease-in-out infinite",
        }}
      >
        {/* WhatsApp SVG icon */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width={30}
          height={30}
        >
          <path
            d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.61 1.824 6.505L4 29l7.703-1.805A11.94 11.94 0 0016 28c6.627 0 12-5.373 12-12S22.627 3 16 3z"
            fill="#fff"
          />
          <path
            d="M16 5.5c-5.247 0-9.5 4.253-9.5 9.5 0 2.08.67 4.007 1.8 5.578l-1.18 4.302 4.42-1.158A9.461 9.461 0 0016 24.5c5.247 0 9.5-4.253 9.5-9.5S21.247 5.5 16 5.5z"
            fill="#25d366"
          />
          <path
            d="M12.387 11.5c-.21-.468-.432-.477-.632-.486-.164-.007-.351-.007-.539-.007-.187 0-.492.07-.75.352-.257.281-.984.961-.984 2.343s1.007 2.719 1.148 2.907c.14.187 1.945 3.105 4.79 4.229 2.37.936 2.846.75 3.36.703.515-.047 1.664-.68 1.898-1.336.234-.656.234-1.219.164-1.336-.07-.117-.258-.187-.539-.328-.281-.14-1.664-.82-1.921-.913-.258-.094-.445-.14-.633.14-.187.281-.726.913-.89 1.1-.164.188-.328.211-.609.07-.281-.14-1.184-.436-2.254-1.39-.833-.742-1.394-1.657-1.558-1.938-.164-.281-.018-.433.123-.573.126-.125.281-.328.422-.492.14-.164.187-.281.281-.469.094-.187.047-.351-.023-.492-.07-.14-.614-1.53-.845-2.086z"
            fill="#fff"
          />
        </svg>
      </a>

      {/* Tooltip label */}
      <div
        className="fixed bottom-[4.8rem] right-6 z-50 pointer-events-none"
        style={{ transform: "translateX(calc(-50% + 30px))" }}
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white whitespace-nowrap"
          style={{
            background: "rgba(18,140,126,0.92)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            backdropFilter: "blur(6px)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
          Chat with us
        </div>
      </div>
    </>
  );
};

export default WhatsAppButton;
