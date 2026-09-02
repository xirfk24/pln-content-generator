import { createClient } from '@/lib/supabase/server'

export async function logAIRequest(
  requestType: string,
  inputData: unknown,
  outputData: unknown,
  modelUsed: string
): Promise<void> {
  try {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: request, error: reqError } = await supabase
      .from('ai_requests')
      .insert({
        request_type: requestType,
        input_data: inputData,
        created_by: user?.id || null,
      })
      .select('id')
      .single()

    if (reqError || !request) {
      console.error('Failed to log AI request:', reqError)
      return
    }

    const { error: outError } = await supabase.from('ai_outputs').insert({
      request_id: request.id,
      output_data: outputData,
      model_used: modelUsed,
    })

    if (outError) {
      console.error('Failed to log AI output:', outError)
    }
  } catch (err) {
    console.error('AI logging failed (non-blocking):', err)
  }
}
