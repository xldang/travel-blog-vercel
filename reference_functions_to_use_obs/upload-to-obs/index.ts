// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Environment variables - equivalent to ObsClient configuration
const accessKeyId = Deno.env.get('OBS_ACCESS_KEY_ID')
const secretAccessKey = Deno.env.get('OBS_SECRET_ACCESS_KEY')
const server = Deno.env.get('OBS_ENDPOINT')  // OBS server endpoint
const bucket = Deno.env.get('OBS_BUCKET')    // Bucket name

// OBS putObject equivalent using HTTP requests (since we can't use SDK in Deno)
async function putObject(bucket: string, key: string, body: Uint8Array, contentType: string, accessKey: string, secretKey: string, server: string): Promise<void> {
  // Create signed URL for PUT request (equivalent to ObsClient.putObject)
  const date = new Date()
  const dateString = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = dateString.slice(0, 8)

  const host = `${bucket}.${server}`
  const canonicalUri = `/${key}`
  const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${accessKey}%2F${dateStamp}%2Fcn-north-4%2Fs3%2Faws4_request&X-Amz-Date=${dateString}&X-Amz-Expires=3600&X-Amz-SignedHeaders=host%3Bx-amz-acl`

  const canonicalHeaders = `host:${host}\nx-amz-acl:public-read\n`
  const signedHeaders = 'host;x-amz-acl'

  const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`

  const credentialScope = `${dateStamp}/cn-north-4/s3/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${dateString}\n${credentialScope}\n${await hashSha256(canonicalRequest)}`

  const signingKey = await getSignatureKey(secretKey, dateStamp, 'cn-north-4', 's3')
  const signature = await hmacSha256(signingKey, stringToSign)
  const signatureHex = Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const signedUrl = `https://${host}/${key}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`

  // Upload file stream using signed URL with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-acl': 'public-read'  // Set ACL to public-read for file access
      },
      body: body,  // File data stream
      signal: controller.signal
    })

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OBS putObject failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timeout: Request took too long');
    }
    throw error;
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

    // Parse the multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string

    if (!file || !fileName) {
      return new Response(JSON.stringify({ error: 'File and fileName are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if all required OBS configuration is available
    if (!accessKeyId || !secretAccessKey || !server || !bucket) {
      return new Response(JSON.stringify({
        error: 'OBS service not configured',
        details: 'Missing OBS credentials or configuration'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Convert file to Uint8Array for OBS upload
    const fileData = new Uint8Array(await file.arrayBuffer())

    // Upload to OBS using putObject equivalent
    await putObject(bucket, fileName, fileData, file.type, accessKeyId, secretAccessKey, server)

    // Generate public URL
    const publicUrl = `https://${bucket}.${server}/${fileName}`

    return new Response(JSON.stringify({
      success: true,
      fileName,
      publicUrl,
      fileSize: file.size,
      mimeType: file.type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Upload function error:', error)
    return new Response(JSON.stringify({
      error: 'Upload failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
