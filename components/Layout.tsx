import { useRouter } from "next/router";
import { WalletComponent } from "./Wallet";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { useToast } from "./ToastProvider";
import { verifySignatureCache } from "../lib/signatureCache";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title = "Base Verify Demo" }: LayoutProps) {
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "0.75rem 0",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            margin: "0 auto",
            padding: "0 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.1rem, 4vw, 1.3rem)",
                fontWeight: "600",
                color: "#1a1a1a",
              }}
            >
              {title}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <NetworkSwitcher />
            <WalletComponent />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1.5rem 1rem",
          flex: 1,
          width: "100%",
        }}
      >
        {children}
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          padding: "1rem",
          borderTop: "1px solid #e5e7eb",
          marginTop: "auto",
        }}
      >
        {/* Footer Links */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <a
            href="https://verify.base.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#6b7280",
              fontSize: "0.8rem",
              textDecoration: "none",
            }}
          >
            Powered by Base Verify
          </a>
          <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>•</span>
          <button
            onClick={() => {
              verifySignatureCache.clear();
              showToast("Cache cleared", "success");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: "0.75rem",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#1a1a1a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            Clear Cache
          </button>
          <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>•</span>
          <button
            onClick={() => router.push("/docs")}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: "0.75rem",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#1a1a1a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            Base Verify Documentation
          </button>
          <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>•</span>
          {!router.asPath.startsWith("/coinbase") && (
            <button
              onClick={() => router.push("/coinbase")}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#1a1a1a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
            >
              Claim Coinbase Airdrop
            </button>
          )}
          {!router.asPath.startsWith("/coinbase") && !router.asPath.startsWith("/onchain") && (
            <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>•</span>
          )}
          {router.asPath.startsWith("/coinbase") && (
            <button
              onClick={() => router.push("/")}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#1a1a1a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
            >
              Claim X Airdrop
            </button>
          )}
          {router.asPath.startsWith("/coinbase") && (
            <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>•</span>
          )}
          {!router.asPath.startsWith("/onchain") && (
            <button
              onClick={() => router.push("/onchain")}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#1a1a1a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
            >
              Claim Onchain Airdrop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
