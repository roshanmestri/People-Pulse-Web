"use client";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the whole
 * document, so it brings its own <html>/<body> and inline styles (globals.css isn't loaded).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          color: "#0f0f10",
        }}
      >
        <title>Something went wrong · Gathr</title>
        <main style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#5c5c63", margin: "0 0 20px" }}>
            Gathr hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#ff5b22",
              color: "#0f0f10",
              border: 0,
              borderRadius: 999,
              padding: "12px 22px",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
