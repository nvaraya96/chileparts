const ALLOWED_ORIGINS = [
  'https://chileparts.cl',
  'https://www.chileparts.cl',
  'https://chileparts.netlify.app',
]

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonRes(corsHeaders: Record<string, string>, status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function fetchWithTimeout(url: string, options: RequestInit, ms = 8000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonRes(corsHeaders, 405, { error: 'Método no permitido' })
  }

  const ct = req.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    return jsonRes(corsHeaders, 415, { error: 'Formato no soportado' })
  }

  try {
    const body = await req.json()
    const { token, nombre, telefono, email, marca, modelo, anio, vin, tipo_vehiculo, repuesto } = body

    if (!token) {
      return jsonRes(corsHeaders, 400, { error: 'Captcha requerido' })
    }

    let tsData: { success: boolean; hostname?: string; challenge_ts?: string }
    try {
      const tsRes = await fetchWithTimeout(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: Deno.env.get('TURNSTILE_SECRET'), response: token })
        },
        8000
      )
      tsData = await tsRes.json()
    } catch (_) {
      console.error('Turnstile timeout o error de red')
      return jsonRes(corsHeaders, 503, { error: 'Servicio de verificación no disponible. Intenta de nuevo.' })
    }

    if (!tsData.success || tsData.hostname !== 'chileparts.cl') {
      return jsonRes(corsHeaders, 400, { error: 'Verificación de seguridad fallida' })
    }

    if (tsData.challenge_ts) {
      const ageMs = Date.now() - new Date(tsData.challenge_ts).getTime()
      if (ageMs > 5 * 60 * 1000) {
        return jsonRes(corsHeaders, 400, { error: 'Verificación expirada. Por favor recarga la página.' })
      }
    }

    if (!nombre?.trim() || !repuesto?.trim()) {
      return jsonRes(corsHeaders, 400, { error: 'Nombre y repuesto son requeridos' })
    }
    if (nombre.trim().length < 2) {
      return jsonRes(corsHeaders, 400, { error: 'Nombre demasiado corto' })
    }
    if (repuesto.trim().length < 5) {
      return jsonRes(corsHeaders, 400, { error: 'Descripción demasiado corta (mín 5 caracteres)' })
    }
    if (repuesto.trim().length > 300) {
      return jsonRes(corsHeaders, 400, { error: 'Descripción demasiado larga (máx 300 caracteres)' })
    }

    if (email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        return jsonRes(corsHeaders, 400, { error: 'Email inválido' })
      }
    }

    if (telefono?.trim()) {
      const telRegex = /^[\d\s+\-()]{6,25}$/
      if (!telRegex.test(telefono.trim())) {
        return jsonRes(corsHeaders, 400, { error: 'Teléfono inválido' })
      }
    }

    let anioNum: number | null = null
    if (anio) {
      const parsed = parseInt(anio)
      if (isNaN(parsed) || parsed < 1886 || parsed > 2030) {
        return jsonRes(corsHeaders, 400, { error: 'Año inválido' })
      }
      anioNum = parsed
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    let insertRes: Response
    try {
      insertRes = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/cotizaciones`,
        {
          method: 'POST',
          headers: {
            'apikey': serviceKey!,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            nombre:        nombre.trim().slice(0, 100),
            telefono:      telefono?.trim().slice(0, 25)      || null,
            email:         email?.trim().slice(0, 100)        || null,
            marca:         marca?.trim().slice(0, 50)         || null,
            modelo:        modelo?.trim().slice(0, 50)        || null,
            anio:          anioNum,
            vin:           vin?.trim().slice(0, 30)           || null,
            tipo_vehiculo: tipo_vehiculo?.trim().slice(0, 50) || null,
            repuesto:      repuesto.trim().slice(0, 300),
            fuente:        'web',
            estado:        'pendiente',
            pago_inicial:  'pendiente',
            pago_final:    'pendiente'
          })
        },
        10000
      )
    } catch (_) {
      console.error('Supabase timeout o error de red')
      return jsonRes(corsHeaders, 503, { error: 'Error al guardar. Por favor intenta de nuevo.' })
    }

    if (!insertRes.ok) {
      const errText = await insertRes.text()
      console.error('Supabase insert error:', errText)
      return jsonRes(corsHeaders, 500, { error: 'Error al procesar la solicitud. Por favor intenta de nuevo.' })
    }

    return jsonRes(corsHeaders, 200, { ok: true })

  } catch (err) {
    console.error('Error inesperado:', err)
    return jsonRes(corsHeaders, 500, { error: 'Error inesperado. Por favor intenta de nuevo.' })
  }
})
