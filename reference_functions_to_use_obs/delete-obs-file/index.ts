// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Environment variables
const accessKeyId = Deno.env.get('OBS_ACCESS_KEY_ID')
const secretAccessKey = Deno.env.get('OBS_SECRET_ACCESS_KEY')
const endpoint = Deno.env.get('OBS_ENDPOINT')
const bucket = Deno.env.get('OBS_BUCKET')

// Manual OBS delete using HTTP requests
async function deleteFromOBS(bucket: string, key: string, accessKey: string, secretKey: string, endpoint: string): Promise<void> {
  const date = new Date()
  const dateString = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = dateString.slice(0, 8)

  const host = `${bucket}.${endpoint}`
  const canonicalUri = `/${key}`
  const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${accessKey}%2F${dateStamp}%2Fcn-north-4%2Fs3%2Faws4_request&X-Amz-Date=${dateString}&X-Amz-Expires=3600&X-Amz-SignedHeaders=host`

  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = 'host'

  const canonicalRequest = `DELETE\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`

  const credentialScope = `${dateStamp}/cn-north-4/s3/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${dateString}\n${credentialScope}\n${await hashSha256(canonicalRequest)}`

  const signingKey = await getSignatureKey(secretKey, dateStamp, 'cn-north-4', 's3')
  const signature = await hmacSha256(signingKey, stringToSign)
  const signatureHex = Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const signedUrl = `https://${host}/${key}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`

  // Delete file using signed URL
  const response = await fetch(signedUrl, {
    method: 'DELETE'
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`OBS delete failed: ${response.status} ${response.statusText}`)
  }
}

async function hashSha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return new Uint8Array(signature)
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key), dateStamp)
  const kRegion = await hmacSha256(kDate, regionName)
  const kService = await hmacSha256(kRegion, serviceName)
  return hmacSha256(kService, 'aws4_request')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const { fileName } = await req.json()

    if (!fileName) {
      return new Response(JSON.stringify({ error: 'fileName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if all required OBS configuration is available
    if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
      return new Response(JSON.stringify({
        error: 'OBS service not configured',
        details: 'Missing OBS credentials or configuration'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Delete file from OBS using manual HTTP request
    await deleteFromOBS(bucket, fileName, accessKeyId, secretAccessKey, endpoint)

    return new Response(JSON.stringify({
      success: true,
      fileName,
      message: 'File deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Delete file function error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to delete file',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
