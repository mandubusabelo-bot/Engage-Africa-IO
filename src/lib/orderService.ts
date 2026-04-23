import { supabaseAdmin } from './supabase-server'
import https from 'https'
import http from 'http'

function postJson(url: string, payload: object, headers: Record<string, string>, redirects = 5): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(payload)
    const buf = Buffer.from(json, 'utf-8')
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': buf.byteLength,
        ...headers
      }
    }
    const req = (isHttps ? https : http).request(options, (res) => {
      const status = res.statusCode || 0
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        // Follow redirect — use GET for 301/302, keep POST for 307/308
        const nextUrl = new URL(res.headers.location, url).toString()
        if (status === 307 || status === 308) {
          postJson(nextUrl, payload, headers, redirects - 1).then(resolve).catch(reject)
        } else {
          // 301/302: follow as GET
          const redir = new URL(nextUrl)
          const isRedirHttps = redir.protocol === 'https:'
          const redirOpts = {
            hostname: redir.hostname,
            port: redir.port || (isRedirHttps ? 443 : 80),
            path: redir.pathname + redir.search,
            method: 'GET',
            headers: { ...headers }
          }
          const redirReq = (isRedirHttps ? https : http).request(redirOpts, (r) => {
            let d = ''
            r.on('data', (c) => { d += c })
            r.on('end', () => {
              try { resolve({ status: r.statusCode || 0, body: JSON.parse(d) }) }
              catch { resolve({ status: r.statusCode || 0, body: d }) }
            })
          })
          redirReq.on('error', reject)
          redirReq.end()
        }
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve({ status, body: JSON.parse(data) }) }
        catch { resolve({ status, body: data }) }
      })
    })
    req.on('error', reject)
    req.write(buf)
    req.end()
  })
}

export interface OrderDetails {
  productName: string
  quantity?: number
  customerName: string
  customerPhone: string
  deliveryMethod: 'pep' | 'mall' | 'courier'
  deliveryLocation: string
  pepStoreCode?: string
}

export interface BookingIntentDetails {
  clientName?: string
  clientPhone?: string
  bookingDate?: string
  startTime?: string
  consultationType?: string
  notes?: string
}

function normalizeBookingDate(raw: string): string | null {
  const token = raw.trim().toLowerCase()
  const now = new Date()

  if (token === 'today') {
    return now.toISOString().slice(0, 10)
  }

  if (token === 'tomorrow') {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  }

  const iso = token.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`
  }

  const local = token.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/)
  if (local) {
    const day = Number(local[1])
    const month = Number(local[2])
    const currentYear = now.getFullYear()
    const year = local[3] ? Number(local[3].length === 2 ? `20${local[3]}` : local[3]) : currentYear

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

function normalizeBookingTime(hourRaw: string, minuteRaw?: string, meridiemRaw?: string): string {
  let hour = Number(hourRaw)
  const minute = minuteRaw ? Number(minuteRaw) : 0
  const meridiem = (meridiemRaw || '').toLowerCase()

  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0

  return `${String(Math.max(0, Math.min(23, hour))).padStart(2, '0')}:${String(Math.max(0, Math.min(59, minute))).padStart(2, '0')}`
}

export function extractBookingDetails(message: string, history: any[]): BookingIntentDetails | null {
  const userMessages = history
    .filter((m: any) => m.sender === 'user' || m.sender === 'contact')
    .map((m: any) => String(m.content || ''))
  userMessages.push(message)

  const combined = userMessages.join(' ').toLowerCase()
  const bookingIntent = /\b(book|booking|consultation|consult|appointment|schedule|slot|available|availability)\b/i.test(combined)
  if (!bookingIntent) return null

  const details: BookingIntentDetails = {}

  for (const msg of userMessages) {
    const trimmed = msg.trim()

    if (!details.clientName) {
      const nameMatch = trimmed.match(/(?:my\s+name\s+is|name\s+is|i\s+am|i'm|call\s+me)\s+([a-z]+(?:\s+[a-z]+){0,2})/i)
      if (nameMatch?.[1]) {
        details.clientName = nameMatch[1]
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ')
      }
    }

    if (!details.clientPhone) {
      const phoneMatch = trimmed.match(/(\+?27\d{9}|0[6-8]\d{8})/)
      if (phoneMatch?.[1]) {
        details.clientPhone = phoneMatch[1].replace(/\s+/g, '')
      }
    }

    if (!details.bookingDate) {
      const dateMatch = trimmed.match(/\b(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\b/i)
      if (dateMatch?.[1]) {
        const normalizedDate = normalizeBookingDate(dateMatch[1])
        if (normalizedDate) details.bookingDate = normalizedDate
      }
    }

    if (!details.startTime) {
      const contextualTimeMatch = trimmed.match(/\b(?:at|for|around|time|slot)\s+([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)?\b/i)
      const amPmMatch = trimmed.match(/\b([1-9]|1[0-2])\s*(am|pm)\b/i)
      const twentyFourHourMatch = trimmed.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)

      if (contextualTimeMatch) {
        details.startTime = normalizeBookingTime(contextualTimeMatch[1], contextualTimeMatch[2], contextualTimeMatch[3])
      } else if (amPmMatch) {
        details.startTime = normalizeBookingTime(amPmMatch[1], '00', amPmMatch[2])
      } else if (twentyFourHourMatch) {
        details.startTime = normalizeBookingTime(twentyFourHourMatch[1], twentyFourHourMatch[2])
      }
    }

    if (!details.consultationType) {
      const lower = trimmed.toLowerCase()
      if (/\b(in person|physical|at your office|face to face)\b/.test(lower)) {
        details.consultationType = 'in_person'
      } else if (/\b(video|online|call|zoom|whatsapp call|phone call)\b/.test(lower)) {
        details.consultationType = 'video'
      }
    }
  }

  if (!details.consultationType) {
    details.consultationType = 'video'
  }

  return Object.keys(details).length > 0 ? details : null
}

export function getMissingBookingInfo(details: BookingIntentDetails): string[] {
  const missing: string[] = []

  if (!details.clientName) missing.push('full name')
  if (!details.clientPhone) missing.push('cellphone number')
  if (!details.bookingDate) missing.push('preferred booking date')
  if (!details.startTime) missing.push('preferred booking time')

  return missing
}

export async function searchAgentProducts(
  query: string,
  limit: number = 10
): Promise<{ success: boolean; products: AgentProduct[]; error?: string }> {
  try {
    const siteUrl = getIntandokaziBaseUrl()
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      return { success: false, products: [], error: 'Missing AGENT_API_SECRET' }
    }

    const q = (query || '').trim()
    const url = `${siteUrl}/api/agent/products/search?q=${encodeURIComponent(q)}&limit=${limit}`
    const res = await fetch(url, {
      headers: { 'x-agent-secret': apiSecret }
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        success: false,
        products: [],
        error: `Failed to search products (${res.status})${text ? `: ${text.slice(0, 180)}` : ''}`
      }
    }

    const data = await res.json().catch(() => null)
    if (!data?.success) {
      return { success: false, products: [], error: data?.error || 'Product search failed' }
    }

    return {
      success: true,
      products: (data.products || []) as AgentProduct[]
    }
  } catch (error: any) {
    return { success: false, products: [], error: error.message }
  }
}

interface OrderResult {
  success: boolean
  orderId?: string
  orderRef?: string
  paymentUrl?: string
  error?: string
}

interface AgentProduct {
  id: string
  name: string
  price: number
  category?: string
  stock_quantity?: number | null
}

function getIntandokaziBaseUrl(): string {
  const raw =
    process.env.INTANDOKAZI_SITE_URL ||
    process.env.NEXT_PUBLIC_INTANDOKAZI_SITE_URL ||
    process.env.NEXT_SITE_URL ||
    'https://intandokaziherbal.co.za'

  return raw.replace(/\/$/, '')
}

// Debug function to fetch and log all available products
export async function debugFetchAllProducts(): Promise<void> {
  try {
    const siteUrl = getIntandokaziBaseUrl()
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      console.error('[Order Service Debug] Missing AGENT_API_SECRET')
      return
    }

    console.log('[Order Service Debug] Fetching all products from Intandokazi...')
    const response = await fetch(`${siteUrl}/api/agent/products/search`, {
      headers: { 'x-agent-secret': apiSecret }
    })

    if (!response.ok) {
      console.error('[Order Service Debug] Failed to fetch products:', response.status)
      return
    }

    const data = await response.json()
    if (data.success && data.products) {
      console.log('[Order Service Debug] Available products:')
      data.products.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. "${p.name}" (R${p.price}) - ${p.category || 'no category'}`)
      })
    } else {
      console.log('[Order Service Debug] No products found or error:', data.error)
    }
  } catch (error) {
    console.error('[Order Service Debug] Error fetching products:', error)
  }
}

export async function createOrderFromConversation(
  phone: string,
  details: OrderDetails
): Promise<OrderResult> {
  try {
    const siteUrl = getIntandokaziBaseUrl()
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      return { success: false, error: 'Missing AGENT_API_SECRET' }
    }

    // Search for product by name with multi-word fallback
    const searchTerms = [details.productName]
    const words = details.productName.split(/\s+/).filter(w => w.length > 2)
    if (words.length > 1) {
      // Add individual word searches as fallbacks
      searchTerms.push(...words)
    }

    let searchData: any = null
    let lastError: string = ''

    for (const term of searchTerms) {
      console.log(`[Order Service] Searching for product: "${term}"`)
      const searchResult = await searchAgentProducts(term, 10)
      if (!searchResult.success) {
        lastError = searchResult.error || 'Search failed'
        console.error(`[Order Service] Search failed for "${term}":`, lastError)
        continue
      }

      if (searchResult.products.length > 0) {
        console.log(`[Order Service] Found ${searchResult.products.length} products for "${term}"`)
        searchResult.products.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`[Order Service]  Match ${i + 1}: "${p.name}" (R${p.price}) stock=${p.stock_quantity ?? 'n/a'}`)
        })
        searchData = { success: true, products: searchResult.products }
        break
      }

      console.log(`[Order Service] No products found for "${term}"`)
    }

    if (!searchData) {
      // Log all available products for debugging
      await debugFetchAllProducts()
      return { success: false, error: lastError || `Product "${details.productName}" not found` }
    }

    const requestedName = details.productName.toLowerCase().trim()
    const inStockProducts = (searchData.products || []).filter((p: AgentProduct) => {
      const stock = p.stock_quantity
      return stock === null || stock === undefined || stock > 0
    })

    if (!inStockProducts.length) {
      return {
        success: false,
        error: `"${details.productName}" is currently out of stock`
      }
    }

    const product =
      inStockProducts.find((p: AgentProduct) => p.name.toLowerCase() === requestedName) ||
      inStockProducts.find((p: AgentProduct) => p.name.toLowerCase().includes(requestedName)) ||
      inStockProducts[0]

    const quantity = details.quantity || 1

    if (product.stock_quantity !== null && product.stock_quantity !== undefined && quantity > product.stock_quantity) {
      return {
        success: false,
        error: `Only ${product.stock_quantity} left for ${product.name}`
      }
    }

    const totalAmount = product.price * quantity

    // Prepare order payload
    const orderPayload = {
      items: [{
        product_id: product.id,
        name: product.name,
        quantity: quantity,
        price: product.price
      }],
      total_amount: totalAmount,
      customer_name: details.customerName,
      customer_phone: details.customerPhone,
      delivery_method: details.deliveryMethod,
      delivery_location: details.deliveryLocation,
      pep_store_code: details.pepStoreCode
    }

    // Create order via API
    const orderUrl = `${siteUrl}/api/agent/orders/prepare`
    const payloadJson = JSON.stringify(orderPayload)

    console.log(`[Order Service] NEXT_SITE_URL=${process.env.NEXT_SITE_URL}`)
    console.log(`[Order Service] INTANDOKAZI_SITE_URL=${process.env.INTANDOKAZI_SITE_URL}`)
    console.log(`[Order Service] Resolved siteUrl=${siteUrl}`)
    console.log(`[Order Service] POSTing to ${orderUrl}`)
    console.log(`[Order Service] Payload: ${payloadJson.slice(0, 300)}`)

    const orderRes = await postJson(orderUrl, orderPayload, { 'x-agent-secret': apiSecret })
    const orderData = orderRes.body

    console.log(`[Order Service] Response status: ${orderRes.status}`)
    console.log(`[Order Service] Response body: ${JSON.stringify(orderData).slice(0, 400)}`)

    if (orderRes.status < 200 || orderRes.status >= 300 || !orderData.success) {
      return {
        success: false,
        error: orderData.error || `Failed to create order (HTTP ${orderRes.status})`
      }
    }

    return {
      success: true,
      orderId: orderData.order.id,
      orderRef: orderData.order.order_ref,
      paymentUrl: orderData.payment_url
    }

  } catch (error: any) {
    console.error('[Order Service] Error:', error)
    return { success: false, error: error?.cause?.code ? `${error.message} (${error.cause.code})` : error.message }
  }
}

// Extract order details from conversation using pattern matching
// Scans the FULL conversation history (all user messages) to piece together details
export function extractOrderDetails(message: string, history: any[]): OrderDetails | null {
  // Combine all USER messages from history + current message
  const userMessages = history
    .filter((m: any) => m.sender === 'user' || m.sender === 'contact')
    .map((m: any) => m.content)
  userMessages.push(message)
  const allUserText = userMessages.join(' ')
  const allUserTextLower = allUserText.toLowerCase()

  const toTitleCase = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')

  // Check for purchase intent keywords across entire conversation
  const purchaseKeywords = [
    'buy', 'purchase', 'order', 'want', 'like to get', 'interested in',
    'get umuthi', 'buy umuthi', 'order umuthi', 'nehla', 'inhlanhla',
    'isichitho', 'vitality', 'utshwala', 'mavula kuvaliwe', 'umaxosha',
    'umuthi', 'protection', 'fertility', 'love potion', 'luck',
    'umaxoshislwane', 'umaxhosislwane', 'umaxhoshislwane', 'umaxhoshislwne', 'umaxosha islwane', 'umaxosislwane',
    'maxoshislwane', 'maxosha islwane', 'maxhosislwane',
    'skin', 'glowing', 'dark spots', 'pimples'
  ]
  
  const hasPurchaseIntent = purchaseKeywords.some(kw => allUserTextLower.includes(kw))
  
  if (!hasPurchaseIntent) {
    return null
  }

  // Product synonym mapping - common terms -> actual product names in Intandokazi
  const productSynonyms: Record<string, string> = {
    'umaxosha': 'umaxosha islwane',
    'umaxosislwane': 'umaxosha islwane',
    'umaxosha islwane': 'umaxosha islwane',
    'umaxoshislwane': 'umaxosha islwane',
    'umaxhosislwane': 'umaxosha islwane',
    'umaxhoshislwane': 'umaxosha islwane',
    'umaxhoshislwne': 'umaxosha islwane',
    'umaxosh islwane': 'umaxosha islwane',
    'maxoshislwane': 'umaxosha islwane',
    'maxosha islwane': 'umaxosha islwane',
    'maxhosislwane': 'umaxosha islwane',
    'mavula': 'mavula kuvaliwe',
    'mavula kuvaliwe': 'mavula kuvaliwe',
    'nehla': 'inhlanhla',
    'inhlanhla': 'inhlanhla',
    'isichitho': 'isichitho',
    'vitality': 'vitality',
    'love': 'love potion',
    'love potion': 'love potion',
    'fertility': 'fertility',
    'protection': 'protection',
    'skin glow': 'skin glow',
    'dark spot': 'dark spot',
    'pimples': 'skin glow',
    'umuthi': 'umuthi wenhlanhla',
    'umuthi wenhlanhla': 'umuthi wenhlanhla',
    'umuthi wothando': 'umuthi wothando',
    'umuthi wokuvika': 'umuthi wokuvika'
  }

  // Try to extract product name from user messages
  const knownProducts = Object.keys(productSynonyms)

  let matchedKeyword = ''
  for (const keyword of knownProducts) {
    if (allUserTextLower.includes(keyword)) {
      matchedKeyword = keyword
      break
    }
  }

  // Get canonical product name from synonym map
  let productName = matchedKeyword ? productSynonyms[matchedKeyword] : ''

  // If no direct match, try regex extraction and clean it up
  if (!productName) {
    const productPatterns = [
      /(?:buy|purchase|order|get|want|need)\s+(?:the\s+)?(?:umuthi\s+)?(?:we?)?(?:z)?([a-z\s]{3,40})(?:\s+for|\s+to|\s+please|\.|,|\?|$)/i,
      /(?:interested\s+in|looking\s+for|want)\s+(?:the\s+)?(?:umuthi\s+)?([a-z\s]{3,40})(?:\s+for|\s+to|\.|,|\?|$)/i,
    ]
    for (const pattern of productPatterns) {
      const match = allUserText.match(pattern)
      if (match && match[1]) {
        let extracted = match[1].trim().toLowerCase()
        // Clean up common noise words
        extracted = extracted
          .replace(/\b(for|one|the|a|an|some|me|my|please|want)\b/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        // Check if cleaned extract matches a synonym
        for (const [keyword, canonical] of Object.entries(productSynonyms)) {
          if (extracted.includes(keyword) || keyword.includes(extracted)) {
            productName = canonical
            break
          }
        }
        if (!productName && extracted.length > 2) {
          productName = extracted
        }
        break
      }
    }
  }

  if (!productName) return null  // Can't create order without a product

  // Extract customer info across ALL user messages
  let customerName = ''
  let customerPhone = ''
  let deliveryLocation = ''
  let pepStoreCode = ''
  let deliveryMethod: 'pep' | 'mall' | 'courier' = 'pep'

  // Extract name — check each user message individually for better matching
  const namePatterns = [
    /(?:my\s+name\s+is|name\s+is|i\s+am|i'm|call\s+me)\s+([a-z]+(?:\s+[a-z]+){0,2})/i,
    /(?:name|surname)[:\s]+([a-z]+(?:\s+[a-z]+){0,2})/i,
  ]
  for (const msg of userMessages) {
    for (const pattern of namePatterns) {
      const match = msg.match(pattern)
      if (match && match[1] && match[1].trim().length > 2) {
        customerName = toTitleCase(match[1].trim())
        break
      }
    }
    if (customerName) break
  }

  // Fallback: look for standalone two-word names in user messages
  if (!customerName) {
    for (const msg of userMessages) {
      const capMatch = msg.match(/^([a-z]+\s+[a-z]+)$/im)
      if (capMatch && capMatch[1]) {
        customerName = toTitleCase(capMatch[1])
        break
      }
    }
  }

  // Extract phone — South African format, scan all messages
  for (const msg of userMessages) {
    const phoneMatch = msg.match(/(\+?27\d{9}|0[6-8]\d{8})/)
    if (phoneMatch) {
      customerPhone = phoneMatch[1].replace(/\s+/g, '')
      break
    }
  }

  // Extract quantity — defaults to 1 if not specified
  let quantity = 1
  for (const msg of userMessages) {
    const qtyMatch = msg.match(/\b(\d{1,2})\s*(?:x|bottle|bottles|item|items|pack|packs|piece|pieces)\b/i)
    if (qtyMatch?.[1]) {
      const parsed = Number(qtyMatch[1])
      if (Number.isFinite(parsed) && parsed > 0) {
        quantity = parsed
        break
      }
    }
  }

  // Extract delivery location — scan all messages
  for (const msg of userMessages) {
    const msgLower = msg.toLowerCase()
    if (msgLower.includes('pep')) {
      deliveryMethod = 'pep'
      const pepMatch = msg.match(/pep\s+(?:store\s+)?([a-z\s]+?)(?:\s+p\d|\.|,|$)/i)
      const codeMatch = msg.match(/[Pp]\d{3,}/)
      if (pepMatch) deliveryLocation = 'PEP Store ' + pepMatch[1].trim()
      if (codeMatch) pepStoreCode = codeMatch[0].toUpperCase()
      if (deliveryLocation) break
    } else if (msgLower.includes('mall')) {
      deliveryMethod = 'mall'
      const mallMatch = msg.match(/([a-z\s]+?)\s+mall/i)
      if (mallMatch) {
        deliveryLocation = mallMatch[1].trim() + ' Mall'
        break
      }
    }
  }
  // Also check combined text for Pep code if we got a location but no code
  if (deliveryLocation && !pepStoreCode) {
    const codeMatch = allUserText.match(/[Pp]\d{3,}/)
    if (codeMatch) pepStoreCode = codeMatch[0].toUpperCase()
  }
  // Location fallback — look for Pep code anywhere even without "pep" keyword
  if (!deliveryLocation) {
    const codeMatch = allUserText.match(/[Pp]\d{3,}/)
    if (codeMatch) {
      pepStoreCode = codeMatch[0].toUpperCase()
      deliveryLocation = `PEP Store (${pepStoreCode})`
      deliveryMethod = 'pep'
    }
  }

  // Return partial extraction once purchase intent + product are found.
  // Missing fields are handled by getMissingInfo() upstream.
  return {
    productName: productName.trim(),
    quantity,
    customerName: customerName.trim(),
    customerPhone,
    deliveryMethod,
    deliveryLocation: deliveryLocation.trim(),
    pepStoreCode
  }
}

// ===== BOOKING FUNCTIONS =====

interface BookingResult {
  success: boolean
  booking?: {
    id: string
    reference: string
    date: string
    time: string
    type: string
    amount: number
    status: string
  }
  error?: string
}

interface AvailabilityResult {
  success: boolean
  availability?: Record<string, Array<{ slot_id: string; time: string; start_time: string; end_time: string; spots_left: number }>>
  total_slots?: number
  error?: string
}

interface BookingCheckResult {
  success: boolean
  bookings?: Array<{
    id: string
    client_name: string
    date: string
    time: string
    type: string
    amount: number
    booking_status: string
    payment_status: string
    reference: string | null
  }>
  count?: number
  error?: string
}

export async function checkBookingAvailability(days: number = 7): Promise<AvailabilityResult> {
  try {
    const siteUrl = getIntandokaziBaseUrl()
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      return { success: false, error: 'Missing AGENT_API_SECRET' }
    }

    const res = await fetch(`${siteUrl}/api/agent/bookings/availability?days=${days}`, {
      headers: { 'x-agent-secret': apiSecret }
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to check availability' }
    }

    return {
      success: true,
      availability: data.availability,
      total_slots: data.total_slots
    }
  } catch (error: any) {
    console.error('[Booking Service] Availability error:', error)
    return { success: false, error: error.message }
  }
}

export async function createBooking(details: {
  clientName: string
  clientPhone: string
  clientEmail?: string
  bookingDate: string
  startTime: string
  endTime?: string
  consultationType?: string
  slotId?: string
  notes?: string
}): Promise<BookingResult> {
  try {
    const siteUrl = getIntandokaziBaseUrl()
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      return { success: false, error: 'Missing AGENT_API_SECRET' }
    }

    const bookingPayload = JSON.stringify({
      client_name: details.clientName,
      client_phone: details.clientPhone,
      client_email: details.clientEmail,
      client_notes: details.notes,
      booking_date: details.bookingDate,
      start_time: details.startTime,
      end_time: details.endTime,
      consultation_type: details.consultationType || 'video',
      slot_id: details.slotId
    })

    const bookingRes = await postJson(`${siteUrl}/api/agent/bookings`, JSON.parse(bookingPayload), { 'x-agent-secret': apiSecret })
    const data = bookingRes.body

    if (bookingRes.status < 200 || bookingRes.status >= 300 || !data.success) {
      return { success: false, error: data.error || `Failed to create booking (HTTP ${bookingRes.status})` }
    }

    return { success: true, booking: data.booking }
  } catch (error: any) {
    console.error('[Booking Service] Create error:', error)
    return { success: false, error: error.message }
  }
}

export async function checkBookingsForPhone(phone: string): Promise<BookingCheckResult> {
  try {
    const siteUrl = getIntandokaziBaseUrl()
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      return { success: false, error: 'Missing AGENT_API_SECRET' }
    }

    const normalizedPhone = phone.replace(/@.*/, '').replace(/\D/g, '')

    const res = await fetch(`${siteUrl}/api/agent/bookings?phone=${encodeURIComponent(normalizedPhone)}`, {
      headers: { 'x-agent-secret': apiSecret }
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to check bookings' }
    }

    return {
      success: true,
      bookings: data.bookings,
      count: data.count
    }
  } catch (error: any) {
    console.error('[Booking Service] Check error:', error)
    return { success: false, error: error.message }
  }
}

export async function checkOrderStatus(orderRef: string): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const siteUrl = getIntandokaziBaseUrl()
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      return { success: false, error: 'Missing AGENT_API_SECRET' }
    }

    const res = await fetch(`${siteUrl}/api/agent/orders/${encodeURIComponent(orderRef)}/status`, {
      headers: { 'x-agent-secret': apiSecret }
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Order not found' }
    }

    return { success: true, order: data.order }
  } catch (error: any) {
    console.error('[Order Service] Status check error:', error)
    return { success: false, error: error.message }
  }
}

// Check if we have all required info or need to ask for more
export function getMissingInfo(details: Partial<OrderDetails>): string[] {
  const missing: string[] = []
  
  if (!details.customerName) missing.push('full name')
  if (!details.customerPhone) missing.push('cellphone number')
  if (!details.deliveryLocation) missing.push('collection location (PEP store or mall)')
  if (!details.productName) missing.push('which product you want to buy')
  
  return missing
}

// Update contact with extracted information
export async function updateContactFromOrder(phone: string, details: OrderDetails): Promise<void> {
  try {
    // Find contact by phone
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, name, phone, email, street_address, city, province, postal_code')
      .ilike('phone', `%${phone.replace(/@.*/, '').replace(/\D/g, '')}%`)
      .limit(1)

    const contact = contacts?.[0]
    if (!contact) {
      console.log('[Contact Update] No contact found for phone:', phone)
      return
    }

    // Build update payload with extracted info
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    // Update name if we have it and contact name is empty/generic
    if (details.customerName && (!contact.name || contact.name.includes('@') || contact.name.length < 3)) {
      updates.name = details.customerName
    }

    // Update phone if we have a cleaner version (store clean number without JID suffix)
    if (details.customerPhone && details.customerPhone.length >= 10) {
      const formattedPhone = details.customerPhone.startsWith('0')
        ? `27${details.customerPhone.substring(1)}`
        : details.customerPhone.replace(/\D/g, '')
      const existingClean = (contact.phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '')
      if (formattedPhone !== existingClean) {
        updates.phone = formattedPhone
      }
    }

    // Update collection/delivery location as address
    if (details.deliveryLocation) {
      updates.street_address = details.deliveryLocation
      
      // Try to extract city from PEP store or mall name
      if (details.deliveryLocation.toLowerCase().includes('pinetown')) {
        updates.city = 'Pinetown'
        updates.province = 'KwaZulu-Natal'
      } else if (details.deliveryLocation.toLowerCase().includes('durban')) {
        updates.city = 'Durban'
        updates.province = 'KwaZulu-Natal'
      } else if (details.deliveryLocation.toLowerCase().includes('johannesburg') || details.deliveryLocation.toLowerCase().includes('sandton')) {
        updates.city = 'Johannesburg'
        updates.province = 'Gauteng'
      } else if (details.deliveryLocation.toLowerCase().includes('cape town')) {
        updates.city = 'Cape Town'
        updates.province = 'Western Cape'
      }
    }

    // Update PEP store code as postal code if available
    if (details.pepStoreCode) {
      updates.postal_code = details.pepStoreCode
    }

    // Only update if we have changes
    if (Object.keys(updates).length > 1) { // > 1 because updated_at is always there
      const { error } = await supabaseAdmin
        .from('contacts')
        .update(updates)
        .eq('id', contact.id)

      if (error) {
        console.error('[Contact Update] Failed to update contact:', error)
      } else {
        console.log('[Contact Update] Updated contact:', contact.id, 'with:', Object.keys(updates))
      }
    }
  } catch (error) {
    console.error('[Contact Update] Error:', error)
  }
}
