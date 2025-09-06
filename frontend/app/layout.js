// app/layout.js
import "./globals.css";
import NavBar from "./components/NavBar";

export const metadata = {
    title: "RoyaltyRiff",
    description: "Music royalties, minted and shared.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-black text-zinc-100 antialiased">
                {/* Wallpaper background + dark overlay */}
                <div className="fixed inset-0 -z-10">
                    <div className="absolute inset-0 bg-[url('/wallpaper.jpg')] bg-cover bg-center bg-fixed" />
                    <div className="absolute inset-0 bg-black/60" /> {/* make 50–70% as needed */}
                </div>

                <NavBar />
                {children}
            </body>
        </html>
    );
}

