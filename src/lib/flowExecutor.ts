import { supabaseAdmin } from './supabase-server'

interface WorkflowStep {
  id: string
  name: string
  type: 'agent_chat' | 'scraper' | 'data_processing' | 'notification' | 'condition' | 'delay'
  config: Record<string, any>
  nextSteps?: string[]
}

export class FlowExecutor {
  async executeFlow(flowId: string, context: Record<string, any> = {}) {
    try {
      // Fetch the flow
      const { data: flow, error } = await supabaseAdmin
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .single()

      if (error) throw error
      if (!flow) throw new Error('Flow not found')
      if (!(flow as any).is_active) throw new Error('Flow is not active')

      const steps = (flow as any).steps as WorkflowStep[]
      if (!steps || steps.length === 0) {
        console.log('Flow has no steps to execute')
        return { success: true, message: 'No steps to execute' }
      }

      // Increment run count (commented out due to type issues, will fix after schema sync)
      // await supabaseAdmin
      //   .from('flows')
      //   .update({ run_count: ((flow as any).run_count || 0) + 1 } as any)
      //   .eq('id', flowId)

      // Execute steps sequentially
      const results = []
      for (const step of steps) {
        const result = await this.executeStep(step, context)
        results.push(result)
        
        // If it's a condition and fails, stop execution
        if (step.type === 'condition' && !result.success) {
          console.log(`Condition step "${step.name}" failed, stopping execution`)
          break
        }
      }

      return { success: true, results }
    } catch (error: any) {
      console.error('Flow execution error:', error)
      return { success: false, error: error.message }
    }
  }

  private async executeStep(step: WorkflowStep, context: Record<string, any>) {
    switch (step.type) {
      case 'agent_chat':
        return this.executeAgentChat(step, context)
      case 'notification':
        return this.executeNotification(step, context)
      case 'delay':
        return this.executeDelay(step, context)
      case 'condition':
        return this.executeCondition(step, context)
      case 'scraper':
        return this.executeScraper(step, context)
      case 'data_processing':
        return this.executeDataProcessing(step, context)
      default:
        console.warn(`Unknown step type: ${step.type}`)
        return { success: false, error: 'Unknown step type' }
    }
  }

  private async executeAgentChat(step: WorkflowStep, context: Record<string, any>) {
    try {
      const { agentId, message } = step.config
      
      if (!agentId) {
        return { success: false, error: 'Agent ID not configured' }
      }

      // Send message to agent
      const chatUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ''}/api/agent-engine/${agentId}/chat`
      console.log(`[Flow] Calling agent chat: ${chatUrl}`)
      
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message || context.message || '',
          conversationId: context.conversationId,
          phone: context.phone
        })
      })

      const data = await response.json()
      return { success: data.success, response: data }
    } catch (error: any) {
      console.error('Agent chat execution error:', error)
      return { success: false, error: error.message }
    }
  }

  private async executeNotification(step: WorkflowStep, context: Record<string, any>) {
    try {
      const { recipient, message, type } = step.config
      
      // In a real implementation, this would send actual notifications
      console.log(`Sending ${type} notification to ${recipient}: ${message}`)
      
      return { success: true, message: 'Notification sent' }
    } catch (error: any) {
      console.error('Notification execution error:', error)
      return { success: false, error: error.message }
    }
  }

  private async executeDelay(step: WorkflowStep, context: Record<string, any>) {
    try {
      const { durationMs = 1000 } = step.config
      
      await new Promise(resolve => setTimeout(resolve, durationMs))
      
      return { success: true, message: `Delayed for ${durationMs}ms` }
    } catch (error: any) {
      console.error('Delay execution error:', error)
      return { success: false, error: error.message }
    }
  }

  private async executeCondition(step: WorkflowStep, context: Record<string, any>) {
    try {
      const { condition } = step.config
      
      // Simple condition evaluation - in production, use a proper expression evaluator
      let passes = false
      
      if (condition === 'always') {
        passes = true
      } else if (condition === 'never') {
        passes = false
      } else if (condition === 'has_message') {
        passes = !!context.message
      } else if (condition === 'has_phone') {
        passes = !!context.phone
      } else {
        // Try to evaluate as a simple boolean expression
        try {
          const result = eval(condition.replace(/\$\{(\w+)\}/g, (_match: string, key: string) => context[key] || ''))
          passes = !!result
        } catch {
          passes = false
        }
      }
      
      return { success: passes, message: passes ? 'Condition passed' : 'Condition failed' }
    } catch (error: any) {
      console.error('Condition execution error:', error)
      return { success: false, error: error.message }
    }
  }

  private async executeScraper(step: WorkflowStep, context: Record<string, any>) {
    try {
      const { url, selector } = step.config
      
      // In a real implementation, this would actually scrape the URL
      console.log(`Scraping ${url} with selector ${selector}`)
      
      return { success: true, message: 'Scraping completed', data: {} }
    } catch (error: any) {
      console.error('Scraper execution error:', error)
      return { success: false, error: error.message }
    }
  }

  private async executeDataProcessing(step: WorkflowStep, context: Record<string, any>) {
    try {
      const { operation, field, value } = step.config
      
      // Simple data processing
      context[field] = value
      
      return { success: true, message: 'Data processed', context }
    } catch (error: any) {
      console.error('Data processing execution error:', error)
      return { success: false, error: error.message }
    }
  }
}

export const flowExecutor = new FlowExecutor()
