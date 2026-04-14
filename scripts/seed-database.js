import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const seedData = async () => {
  console.log('Seeding database...')

  // Insert agents
  const agents = [
    {
      name: 'Customer Support Bot',
      description: 'AI-powered customer support agent that handles inquiries and resolves issues',
      instructions: 'You are a professional customer support agent. Your role is to:\n1. Be friendly, empathetic, and patient with all customers\n2. Listen carefully to understand customer issues\n3. Provide clear, helpful solutions and explanations\n4. Escalate complex issues to human agents when necessary\n5. Maintain a positive and professional tone\n6. Follow company policies and procedures\n7. Document all interactions accurately\n8. Always prioritize customer satisfaction',
      personality: 'professional',
      language: 'english',
      status: 'active',
      message_count: 0,
      response_rate: 95
    },
    {
      name: 'Sales Assistant',
      description: 'AI sales agent that helps customers find the right products and drives conversions',
      instructions: 'You are an expert sales assistant. Your role is to:\n1. Understand customer needs and requirements\n2. Recommend the most suitable products or services\n3. Handle objections professionally and persuasively\n4. Build rapport and trust with potential customers\n5. Highlight key benefits and value propositions\n6. Guide customers through the buying process\n7. Follow up appropriately without being pushy\n8. Track and report sales activities',
      personality: 'enthusiastic',
      language: 'english',
      status: 'active',
      message_count: 0,
      response_rate: 90
    },
    {
      name: 'Product Finder',
      description: 'AI product discovery agent that helps customers find products based on their needs',
      instructions: 'You are a product discovery specialist. Your role is to:\n1. Analyze customer requirements and preferences\n2. Search and recommend relevant products\n3. Compare features and benefits of different options\n4. Provide detailed product information and specifications\n5. Consider budget constraints and value for money\n6. Check product availability and delivery options\n7. Suggest alternatives if exact matches aren\'t available\n8. Help customers make informed purchasing decisions',
      personality: 'analytical',
      language: 'english',
      status: 'active',
      message_count: 0,
      response_rate: 92
    }
  ]

  for (const agent of agents) {
    const { error } = await supabase.from('agents').insert(agent)
    if (error) {
      console.error('Error inserting agent:', agent.name, error)
    } else {
      console.log('✓ Inserted agent:', agent.name)
    }
  }

  // Insert flows
  const flows = [
    {
      name: 'Welcome New Customers',
      description: 'Automatically send welcome message to new customers',
      trigger_type: 'new_contact',
      nodes: [
        {
          id: 'welcome-node',
          type: 'message',
          data: {
            message: 'Welcome to Engage Africa IO! We are excited to have you. How can we help you today?'
          }
        }
      ],
      edges: [],
      status: 'active'
    },
    {
      name: 'Qualify Sales Leads',
      description: 'Automatically qualify and route sales leads',
      trigger_type: 'keyword',
      nodes: [
        {
          id: 'tag-node',
          type: 'tag',
          data: {
            tags: ['sales_lead', 'high_priority']
          }
        },
        {
          id: 'message-node',
          type: 'message',
          data: {
            message: 'Great! Let me connect you with our sales team to discuss your needs.'
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'tag-node',
          target: 'message-node'
        }
      ],
      status: 'active'
    },
    {
      name: 'Product Inquiry Handler',
      description: 'Route product questions to product finder agent',
      trigger_type: 'keyword',
      nodes: [
        {
          id: 'inquiry-message-node',
          type: 'message',
          data: {
            message: 'I can help you find the perfect product! Let me ask you a few questions.'
          }
        }
      ],
      edges: [],
      status: 'active'
    },
    {
      name: 'Create Support Ticket',
      description: 'Automatically create support tickets for issues',
      trigger_type: 'keyword',
      nodes: [
        {
          id: 'support-tag-node',
          type: 'tag',
          data: {
            tags: ['support_ticket', 'needs_attention']
          }
        },
        {
          id: 'support-message-node',
          type: 'message',
          data: {
            message: 'I am sorry to hear you are having an issue. Let me help you resolve this.'
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'support-tag-node',
          target: 'support-message-node'
        }
      ],
      status: 'active'
    }
  ]

  for (const flow of flows) {
    const { error } = await supabase.from('flows').insert(flow)
    if (error) {
      console.error('Error inserting flow:', flow.name, error)
    } else {
      console.log('✓ Inserted flow:', flow.name)
    }
  }

  console.log('✓ Database seeding complete!')
}

seedData()
