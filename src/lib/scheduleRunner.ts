import { supabaseAdmin } from './supabase-server'
import { flowExecutor } from './flowExecutor'
import * as cron from 'node-cron'

// Robust scheduler using node-cron for scheduled flows
export class ScheduleRunner {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map()
  private isRunning = false

  async start() {
    if (this.isRunning) {
      console.log('Schedule runner is already running')
      return
    }

    this.isRunning = true
    console.log('Starting schedule runner with node-cron...')

    // Load and schedule all active flows with scheduled triggers
    await this.loadAndScheduleFlows()
  }

  stop() {
    this.scheduledTasks.forEach((task) => task.stop())
    this.scheduledTasks.clear()
    this.isRunning = false
    console.log('Schedule runner stopped')
  }

  async reload() {
    // Reload schedules (useful when flows are added/updated)
    this.stop()
    await this.start()
  }

  private async loadAndScheduleFlows() {
    try {
      const { data: flows, error } = await supabaseAdmin
        .from('flows')
        .select('*')
        .eq('is_active', true)
        .not('trigger', 'is', null)

      if (error) throw error
      if (!flows || flows.length === 0) return

      for (const flow of flows) {
        const trigger = (flow as any).trigger as any
        
        if (trigger?.type === 'scheduled' && trigger?.schedule) {
          this.scheduleFlow((flow as any).id, (flow as any).name, trigger.schedule)
        }
      }

      console.log(`Loaded ${this.scheduledTasks.size} scheduled flows`)
    } catch (error: any) {
      console.error('Error loading scheduled flows:', error)
    }
  }

  private scheduleFlow(flowId: string, flowName: string, cronSchedule: string) {
    try {
      // Validate cron schedule
      if (!cron.validate(cronSchedule)) {
        console.warn(`Invalid cron schedule for flow "${flowName}": ${cronSchedule}`)
        return
      }

      // Stop existing task if any
      if (this.scheduledTasks.has(flowId)) {
        this.scheduledTasks.get(flowId)!.stop()
      }

      // Create new scheduled task
      const task = cron.schedule(cronSchedule, async () => {
        console.log(`[CRON] Executing scheduled flow: ${flowName}`)
        await flowExecutor.executeFlow(flowId, {
          triggerType: 'scheduled',
          timestamp: new Date().toISOString()
        })
      }, {
        timezone: process.env.TZ || 'UTC'
      })

      this.scheduledTasks.set(flowId, task)
      console.log(`[CRON] Scheduled flow "${flowName}" with pattern: ${cronSchedule}`)
    } catch (error: any) {
      console.error(`Error scheduling flow "${flowName}":`, error)
    }
  }

  // Manually trigger a scheduled flow (for testing)
  async manualTrigger(flowId: string) {
    const { data: flow, error } = await supabaseAdmin
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single()

    if (error) throw error
    if (!flow) throw new Error('Flow not found')

    const trigger = flow.trigger as any
    if (trigger?.type !== 'scheduled') {
      throw new Error('Flow is not a scheduled flow')
    }

    console.log(`[MANUAL] Triggering scheduled flow: ${flow.name}`)
    await flowExecutor.executeFlow(flowId, {
      triggerType: 'scheduled',
      timestamp: new Date().toISOString()
    })
  }
}

export const scheduleRunner = new ScheduleRunner()
