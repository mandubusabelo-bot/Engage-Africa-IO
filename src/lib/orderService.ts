import { supabaseAdmin } from './supabase-server'

interface OrderDetails {
  productName: string
  quantity?: number
  customerName: string
  customerPhone: string
  deliveryMethod: 'pep' | 'mall' | 'courier'
  deliveryLocation: string
  pepStoreCode?: string
}

interface OrderResult {
  success: boolean
  orderRef?: string
  paymentUrl?: string
  error?: string
}

function getIntandokaziBaseUrl(): string {
  const raw =
    process.env.INTANDOKAZI_SITE_URL ||
    process.env.NEXT_PUBLIC_INTANDOKAZI_SITE_URL ||
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
      const searchResponse = await fetch(`${siteUrl}/api/agent/products/search?q=${encodeURIComponent(term)}`, {
        headers: { 'x-agent-secret': apiSecret }
      })

      if (!searchResponse.ok) {
        const errText = await searchResponse.text().catch(() => '')
        lastError = `Failed to search products (${searchResponse.status})${errText ? `: ${errText.slice(0, 180)}` : ''}`
        console.error(`[Order Service] Search failed for "${term}":`, lastError)
        continue
      }

      const data = await searchResponse.json()
      if (data.success && data.products && data.products.length > 0) {
        console.log(`[Order Service] Found ${data.products.length} products for "${term}"`)
        // Log found product names for debugging
        data.products.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`[Order Service]  Match ${i + 1}: "${p.name}" (R${p.price})`)
        })
        searchData = data
        break
      }
      console.log(`[Order Service] No products found for "${term}"`)
    }

    if (!searchData) {
      // Log all available products for debugging
      await debugFetchAllProducts()
      return { success: false, error: lastError || `Product "${details.productName}" not found` }
    }

    const product = searchData.products[0]
    const quantity = details.quantity || 1
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
    const payloadBuffer = Buffer.from(payloadJson, 'utf8')

    let orderResponse: Response
    try {
      orderResponse = await fetch(orderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-secret': apiSecret
        },
        body: payloadBuffer
      })
    } catch (postErr: any) {
      const causeCode = postErr?.cause?.code || postErr?.code
      if (causeCode === 'UND_ERR_REQ_CONTENT_LENGTH_MISMATCH') {
        console.warn('[Order Service] Content-length mismatch on order POST, retrying once...')
        await new Promise((resolve) => setTimeout(resolve, 300))
        orderResponse = await fetch(orderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-agent-secret': apiSecret
          },
          body: payloadBuffer
        })
      } else {
        throw postErr
      }
    }

    const orderData = await orderResponse.json()

    if (!orderResponse.ok || !orderData.success) {
      return { 
        success: false, 
        error: orderData.error || 'Failed to create order' 
      }
    }

    return {
      success: true,
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
    const phoneMatch = msg.match(/(0[6-8]\d{8})/)
    if (phoneMatch) {
      customerPhone = phoneMatch[1]
      break
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

  // Only return if we have ALL required details
  if (customerName && customerPhone && deliveryLocation && productName) {
    return {
      productName: productName.trim(),
      quantity: 1,
      customerName: customerName.trim(),
      customerPhone,
      deliveryMethod,
      deliveryLocation: deliveryLocation.trim(),
      pepStoreCode
    }
  }

  return null
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

    const res = await fetch(`${siteUrl}/api/agent/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': apiSecret
      },
      body: JSON.stringify({
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
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create booking' }
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

    // Update phone if we have a cleaner version
    if (details.customerPhone && details.customerPhone.length >= 10) {
      const formattedPhone = details.customerPhone.startsWith('0') 
        ? `27${details.customerPhone.substring(1)}@s.whatsapp.net`
        : `${details.customerPhone}@s.whatsapp.net`
      if (formattedPhone !== contact.phone) {
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
