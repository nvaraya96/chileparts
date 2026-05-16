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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    const { token, nombre, telefono, email, marca, modelo, anio, vin, tipo_vehiculo, repuesto } = body

    // 1. Verificar token Turnstile con Cloudflare
    if (!token) {
      return new Response(JSON.stringify({ error: 'Captcha requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: Deno.env.get('TURNSTILE_SECRET'),
        response: token
      })
    })

    const tsData = await tsRes.json()

    if (!tsData.success) {
      return new Response(JSON.stringify({ error: 'Verificación de seguridad fallida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Validar campos requeridos en el servidor
    if (!nombre?.trim() || !repuesto?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre y repuesto son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (repuesto.trim().length > 300) {
      return new Response(JSON.stringify({ error: 'Descripción demasiado larga (máx 300 caracteres)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Insertar en Supabase con service_role key (nunca expuesta al cliente)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/cotizaciones`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey!,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        nombre:        nombre.trim().slice(0, 100),
        telefono:      telefono?.trim().slice(0, 20)  || null,
        email:         email?.trim().slice(0, 100)    || null,
        marca:         marca?.trim().slice(0, 50)     || null,
        modelo:        modelo?.trim().slice(0, 50)    || null,
        anio:          anio?.trim().slice(0, 10)      || null,
        vin:           vin?.trim().slice(0, 30)       || null,
        tipo_vehiculo: tipo_vehiculo?.trim().slice(0, 50) || null,
        repuesto:      repuesto.trim().slice(0, 300),
        fuente:        'web',
        estado:        'pendiente',
        pago_inicial:  'pendiente',
        pago_final:    'pendiente'
      })
    })

    if (!insertRes.ok) {
      const errText = await insertRes.text()
      throw new Error('Error BD: ' + errText.slice(0, 120))
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
