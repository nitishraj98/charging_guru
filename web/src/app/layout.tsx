import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";

export const metadata: Metadata = {
  title: "Charging Guru",
  description: "Find, book and pay for EV charging — guaranteed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const savedTheme = cookies().get("cg_theme")?.value;
  const initialTheme = savedTheme === "dark" ? "dark" : "light";

  return (
    <html lang="en" data-theme={initialTheme} style={{ colorScheme: initialTheme }} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cg_theme');var theme=t==='dark'?'dark':t==='light'?'light':document.documentElement.getAttribute('data-theme')||'light';document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;document.cookie='cg_theme='+theme+'; path=/; max-age=31536000; samesite=lax';}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider initialTheme={initialTheme}>
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
