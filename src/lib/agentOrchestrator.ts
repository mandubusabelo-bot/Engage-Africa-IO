import {
  createOrderFromConversation,
  searchAgentProducts,
  type OrderDetails
} from '@/lib/orderService'
import { notify } from '@/lib/services/internalNotifier'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrchestratorMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
}

export interface OrchestratorResult {
  reply: string
  toolCalls: Array<{ tool: string; args: any; result: any }>
  orderCreated?: {
    orderId?: string
    orderRef?: string
    paymentUrl?: string
  }
}

export interface OrchestratorContext {
  conversationId?: string
  phone?: string
  agentName: string
  agentId?: string
}

type LLMCaller = (messages: OrchestratorMessage[]) => Promise<string>

// ─── Tool contract (JSON shape the LLM must emit) ───────────────────────────
//
// The LLM emits a tool call using the tag:
//   [[TOOL_CALL]]{"tool":"<name>","args":{...}}[[/TOOL_CALL]]
//
// Tools:
//   1. search_products { query: string }
//        → { products: [{ name, price, stock }] }
//
//   2. get_payment_details { method: "eft" | "capitec" }
//        → { bank, account_name, account_number?, linked_number? }
//
//   3. create_order {
//        product_name, quantity, customer_name, customer_phone,
//        delivery_method: "pep"|"mall"|"courier",
//        delivery_location, pep_store_code?,
//        payment_method: "agent_online" | "eft" | "capitec"
//      }
//      → { success, order_ref, payment_url?, payment_details? }

// ─── System prompt builder ──────────────────────────────────────────────────

export function buildCommerceSystemPrompt(basePrompt: string, ctx: OrchestratorContext): string {
  return `${basePrompt}

You are ${ctx.agentName}, a sales assistant for Intandokazi Herbal Products.
You drive the entire sale conversationally. Be warm, concise, and natural.

AVAILABLE TOOLS — call these by emitting exactly this format on its own line:
[[TOOL_CALL]]{"tool":"<name>","args":{...}}[[/TOOL_CALL]]

Tools:
1. search_products { "query": "<search text>" }
   Use when the customer asks about products, prices, or availability BEFORE making any claims.

2. get_payment_details { "method": "eft" | "capitec" }
   Use when the customer chooses EFT or Capitec and you need the banking details.

3. create_order {
     "product_name": "<canonical product name>",
     "quantity": <number>,
     "customer_name": "<full name>",
     "customer_phone": "<SA cellphone>",
     "delivery_method": "pep" | "mall" | "courier",
     "delivery_location": "<store/mall name>",
     "pep_store_code": "<optional PEP code>",
     "payment_method": "agent_online" | "eft" | "capitec"
   }
   Use ONLY after you have all required details AND the customer has chosen a payment method.

FLOW RULES:
- Collect these before creating an order: product, quantity, full name, cellphone, collection point (PEP store + code, mall, or courier address).
- Always confirm the order summary before creating.
- PAYMENT OPTIONS (CRITICAL - MUST FOLLOW EXACTLY):
  When you have confirmed the order and need to ask about payment, you MUST say EXACTLY this text and NOTHING ELSE:
  "I can make the payment for you. Alternatively, use these other options:
  1) EFT / Bank transfer
  2) Capitec transfer"
  Do NOT say "How would you like to pay?" or any other variation. Use the EXACT text above.
- If they say "yes", "please", "go ahead", "agent pay", "ok", or similar — call create_order with payment_method "agent_online"
- If they choose EFT — call get_payment_details with method "eft"
- If they choose Capitec — call get_payment_details with method "capitec"
- Never invent product names or prices — always call search_products first.
- Never promise a payment link without calling create_order.
- Keep replies short. Use at most one emoji per message.
- Do not greet returning customers.

When a tool returns, use its result to continue the conversation naturally. Never show the raw JSON to the customer.`
}

// ─── Tool executors ─────────────────────────────────────────────────────────

async function toolSearchProducts(args: any) {
  const query = String(args?.query || '').trim()
  const res = await searchAgentProducts(query, 10)
  if (!res.success) {
    return { ok: false, error: res.error || 'Product search failed' }
  }
  return {
    ok: true,
    products: res.products.slice(0, 10).map((p: any) => ({
      name: p.name,
      price: Number(p.price || 0),
      stock: p.stock_quantity ?? null
    }))
  }
}

function toolGetPaymentDetails(args: any) {
  const method = String(args?.method || '').toLowerCase()
  if (method === 'eft') {
    return {
      ok: true,
      method: 'eft',
      bank: 'Capitec Bank',
      account_name: 'Miss Mokoatle',
      account_number: '1506845620',
      instructions: 'After payment please send your Proof of Payment (POP).'
    }
  }
  if (method === 'capitec') {
    return {
      ok: true,
      method: 'capitec',
      account_name: 'Miss Mokoatle',
      linked_number: '0625842441',
      instructions: 'After payment please send your Proof of Payment (POP).'
    }
  }
  return { ok: false, error: `Unknown payment method: ${method}` }
}

async function toolCreateOrder(args: any, ctx: OrchestratorContext) {
  const details: OrderDetails = {
    productName: String(args?.product_name || '').trim(),
    quantity: Number(args?.quantity || 1),
    customerName: String(args?.customer_name || '').trim(),
    customerPhone: String(args?.customer_phone || '').trim(),
    deliveryMethod: (String(args?.delivery_method || 'pep').toLowerCase() as any),
    deliveryLocation: String(args?.delivery_location || '').trim(),
    pepStoreCode: String(args?.pep_store_code || '').trim() || undefined
  }

  const paymentMethod = String(args?.payment_method || 'agent_online').toLowerCase()
  const persistPhone = ctx.phone || details.customerPhone || `test-${ctx.agentId || 'ui'}`

  const orderResult = await createOrderFromConversation(persistPhone, details)
  if (!orderResult.success) {
    return { ok: false, error: orderResult.error || 'Failed to create order' }
  }

  // Fire dispatch notification but don't block on failure
  try {
    await notify('dispatch_pending_order', {
      'contact.name': details.customerName,
      'contact.phone': persistPhone,
      'order.productName': details.productName,
      'order.qty': String(details.quantity || 1),
      'order.price': '0.00',
      'order.totalAmount': '0.00',
      'order.collectionDetails': details.deliveryLocation,
      'order.contactName': details.customerName,
      'order.ref': orderResult.orderRef || 'pending',
      'dispatch.timestamp': new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
    }, {
      role: 'dispatch',
      conversationId: ctx.conversationId,
      orderId: orderResult.orderId
    })
  } catch (err: any) {
    console.error('[Orchestrator] Dispatch notify failed:', err?.message || err)
  }

  const base = {
    ok: true,
    order_ref: orderResult.orderRef,
    order_id: orderResult.orderId,
    payment_method: paymentMethod
  }

  if (paymentMethod === 'agent_online') {
    return { ...base, payment_url: orderResult.paymentUrl || null }
  }
  if (paymentMethod === 'eft') {
    return { ...base, payment_details: toolGetPaymentDetails({ method: 'eft' }) }
  }
  if (paymentMethod === 'capitec') {
    return { ...base, payment_details: toolGetPaymentDetails({ method: 'capitec' }) }
  }
  return base
}

async function executeTool(name: string, args: any, ctx: OrchestratorContext) {
  switch (name) {
    case 'search_products':
      return toolSearchProducts(args)
    case 'get_payment_details':
      return toolGetPaymentDetails(args)
    case 'create_order':
      return toolCreateOrder(args, ctx)
    default:
      return { ok: false, error: `Unknown tool: ${name}` }
  }
}

// ─── Tool-call parser ───────────────────────────────────────────────────────

const TOOL_CALL_RE = /\[\[TOOL_CALL\]\]([\s\S]*?)\[\[\/TOOL_CALL\]\]/i

interface ParsedCall {
  tool: string
  args: any
  preText: string
  postText: string
}

function parseToolCall(text: string): ParsedCall | null {
  const m = text.match(TOOL_CALL_RE)
  if (!m) return null
  const jsonPart = m[1].trim()
  try {
    const parsed = JSON.parse(jsonPart)
    if (!parsed || typeof parsed.tool !== 'string') return null
    return {
      tool: parsed.tool,
      args: parsed.args || {},
      preText: text.slice(0, m.index!).trim(),
      postText: text.slice(m.index! + m[0].length).trim()
    }
  } catch {
    return null
  }
}

function stripToolCalls(text: string): string {
  return text.replace(/\[\[TOOL_CALL\]\][\s\S]*?\[\[\/TOOL_CALL\]\]/gi, '').trim()
}

// ─── Orchestrator loop ──────────────────────────────────────────────────────

export async function runAgentOrchestrator(
  messages: OrchestratorMessage[],
  ctx: OrchestratorContext,
  callLLM: LLMCaller,
  maxIterations = 3
): Promise<OrchestratorResult> {
  const workingMessages = [...messages]
  const toolCalls: OrchestratorResult['toolCalls'] = []
  let orderCreated: OrchestratorResult['orderCreated']

  for (let i = 0; i < maxIterations; i++) {
    const raw = await callLLM(workingMessages)
    const call = parseToolCall(raw)

    if (!call) {
      return {
        reply: stripToolCalls(raw) || 'How can I help you?',
        toolCalls,
        orderCreated
      }
    }

    console.log(`[Orchestrator] iter=${i} tool=${call.tool} args=${JSON.stringify(call.args).slice(0, 200)}`)

    const result = await executeTool(call.tool, call.args, ctx)
    toolCalls.push({ tool: call.tool, args: call.args, result })

    if (call.tool === 'create_order' && (result as any)?.ok) {
      orderCreated = {
        orderId: (result as any).order_id,
        orderRef: (result as any).order_ref,
        paymentUrl: (result as any).payment_url
      }
    }

    // Feed tool result back to LLM
    workingMessages.push({ role: 'assistant', content: raw })
    workingMessages.push({
      role: 'tool',
      name: call.tool,
      content: JSON.stringify(result)
    })
  }

  // Max iterations reached — force a plain reply from LLM
  const finalRaw = await callLLM([
    ...workingMessages,
    {
      role: 'system',
      content: 'Respond to the customer in natural language now. Do not emit any more tool calls.'
    }
  ])
  return {
    reply: stripToolCalls(finalRaw) || 'Let me check on that and get back to you shortly.',
    toolCalls,
    orderCreated
  }
}
