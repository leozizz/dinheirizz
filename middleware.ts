import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")

export async function middleware(request: NextRequest) {
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = []
  let cacheHeadersToSet: Record<string, string> = {}
  const cookieStore = request.cookies.getAll()
  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore
      },
      setAll(cookiesToSetIncoming, headers) {
        cookiesToSet.push(...cookiesToSetIncoming)
        cacheHeadersToSet = headers
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isRoot = pathname === "/"
  const isDashboard = pathname.startsWith("/dashboard")

  const applyCookies = (response: NextResponse) => {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })

    Object.entries(cacheHeadersToSet).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }

  if (isRoot && user) {
    return applyCookies(NextResponse.redirect(new URL("/dashboard", request.url)))
  }

  if (isDashboard && !user) {
    return applyCookies(NextResponse.redirect(new URL("/", request.url)))
  }

  return applyCookies(NextResponse.next())
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
}