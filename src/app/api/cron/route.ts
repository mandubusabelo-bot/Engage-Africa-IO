import { NextResponse } from 'next/server'
import { scheduleRunner } from '@/lib/scheduleRunner'

// This endpoint can be called by an external cron service (like Vercel Cron)
// or called internally to start the scheduler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'start') {
    scheduleRunner.start()
    return NextResponse.json({ success: true, message: 'Schedule runner started' })
  }

  if (action === 'stop') {
    scheduleRunner.stop()
    return NextResponse.json({ success: true, message: 'Schedule runner stopped' })
  }

  if (action === 'check') {
    // Check for scheduled flows that need to run
    // This can be called by an external cron service every minute
    await scheduleRunner['checkScheduledFlows']()
    return NextResponse.json({ success: true, message: 'Checked scheduled flows' })
  }

  return NextResponse.json({ success: true, message: 'Schedule runner endpoint' })
}
