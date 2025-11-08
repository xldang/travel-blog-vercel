import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ImageVariant {
  name: string
  width: number
  height: number
  quality?: number
}

const VARIANTS: ImageVariant[] = [
  { name: 'thumbnail', width: 150, height: 150, quality: 80 },
  { name: 'medium', width: 400, height: 400, quality: 85 },
  { name: 'large', width: 800, height: 800, quality: 90 }
]

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageId } = await req.json()

    if (!imageId) {
      return new Response(
        JSON.stringify({ error: 'imageId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the original image
    const { data: imageData, error: fetchError } = await supabaseClient
      .from('images')
      .select('file_path')
      .eq('id', imageId)
      .single()

    if (fetchError || !imageData?.file_path) {
      throw new Error('Failed to get image file path')
    }

    const filePath = imageData.file_path;

    // Download the original image
    const { data: originalImage, error: downloadError } = await supabaseClient.storage
      .from('post-images')
      .download(filePath)

    if (downloadError || !originalImage) {
      throw new Error('Failed to download original image')
    }

    const results = []

    // Generate variants (for now, just copy the original image to variant paths)
    // TODO: Implement proper image resizing when a compatible library is available
    for (const variant of VARIANTS) {
      try {
        // Generate new file path
        const fileExt = filePath.split('.').pop()
        const variantPath = `${filePath.replace('.' + fileExt, '')}_${variant.name}.${fileExt}`

        // For now, just copy the original image (no resizing)
        // This allows the get_image_path_by_size function to work
        const { error: uploadError } = await supabaseClient.storage
          .from('post-images')
          .upload(variantPath, originalImage, {
            contentType: originalImage.type,
            upsert: true
          })

        if (uploadError) {
          console.error(`Failed to upload ${variant.name}:`, uploadError)
          continue
        }

        results.push({ variant: variant.name, path: variantPath })
      } catch (error) {
        console.error(`Failed to process ${variant.name}:`, error)
      }
    }

    // Update database with variant paths
    const updateData: any = {}
    results.forEach(({ variant, path }) => {
      updateData[`${variant}_path`] = path
    })

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseClient
        .from('images')
        .update(updateData)
        .eq('id', imageId)

      if (updateError) {
        console.error('Failed to update image variants:', updateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        variants: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating thumbnails:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
