import './globals.css'
import Script from 'next/script'
import { Toaster } from '@/components/ui/sonner'
import { GoogleOAuthProvider } from '@react-oauth/google'

export const metadata = {
  title: 'FarmBid - Blockchain Agricultural Auctions',
  description: 'Farmers set the price. Buyers compete upward. Blockchain guarantees it all.',
  icons: {
    icon: '/favicon.ico'
  }
}

export default function RootLayout({ children }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1029926669524-ofsccdtlbsjqo5sbvino6il9llq3ecuq.apps.googleusercontent.com'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <Script
          id="perf-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <GoogleOAuthProvider clientId={clientId}>
          {children}
          <Toaster position="top-right" />
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}
