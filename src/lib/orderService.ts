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

export async function createOrderFromConversation(
  phone: string,
  details: OrderDetails
): Promise<OrderResult> {
  try {
    const siteUrl = process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://intandokaziherbal.co.za'
    const apiSecret = process.env.AGENT_API_SECRET

    if (!apiSecret) {
      return { success: false, error: 'Missing AGENT_API_SECRET' }
    }

    // Search for product by name
    const searchResponse = await fetch(`${siteUrl}/api/agent/products/search?q=${encodeURIComponent(details.productName)}`, {
      headers: {
        'x-agent-secret': apiSecret
      }
    })

    if (!searchResponse.ok) {
      return { success: false, error: 'Failed to search products' }
    }

    const searchData = await searchResponse.json()
    
    if (!searchData.success || !searchData.products || searchData.products.length === 0) {
      return { success: false, error: `Product "${details.productName}" not found` }
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
    const orderResponse = await fetch(`${siteUrl}/api/agent/orders/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': apiSecret
      },
      body: JSON.stringify(orderPayload)
    })

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
    return { success: false, error: error.message }
  }
}

// Extract order details from conversation using pattern matching
export function extractOrderDetails(message: string, history: any[]): OrderDetails | null {
  const fullText = message.toLowerCase()
  
  // Check for purchase intent keywords
  const purchaseKeywords = [
    'buy', 'purchase', 'order', 'want', 'like to get', 'interested in',
    'get umuthi', 'buy umuthi', 'order umuthi', 'nehla', 'inhlanhla',
    'isichitho', 'skin', 'love', 'luck', 'fertility', 'utshwala'
  ]
  
  const hasPurchaseIntent = purchaseKeywords.some(kw => fullText.includes(kw))
  
  if (!hasPurchaseIntent) {
    return null
  }

  // Try to extract product name
  const productPatterns = [
    /(?:buy|purchase|order|get)\s+(?:umuthi\s+)?(?:we?)?(?:z)?([a-z\s]+?)(?:\s+for|\s+to|\.|,|$)/i,
    /(?:interested\s+in|want)\s+(?:the\s+)?(?:umuthi\s+)?(?:we?)?(?:z)?([a-z\s]+?)(?:\s+for|\s+to|\.|,|$)/i,
    /(?:nehla|inhlanhla|isichitho|vitality|love|luck|fertility)/i
  ]

  let productName = ''
  for (const pattern of productPatterns) {
    const match = message.match(pattern)
    if (match) {
      productName = match[1] || match[0]
      break
    }
  }

  if (!productName) {
    productName = 'umuthi wenhlanhla' // default fallback
  }

  // Extract customer info from history and current message
  let customerName = ''
  let customerPhone = ''
  let deliveryLocation = ''
  let pepStoreCode = ''
  let deliveryMethod: 'pep' | 'mall' | 'courier' = 'pep'

  // Combine all messages for extraction
  const allText = history.map(m => m.content).join(' ') + ' ' + message

  // Extract name - look for patterns like "name is" or "i am"
  const namePatterns = [
    /(?:name\s+(?:is\s+)?|i\s+am\s+|call\s+me\s+)([a-z\s]+?)(?:\s+and|\s+my|\.|,|$)/i,
    /^([a-z\s]+?)(?:\s+\d|\s+pep|\s+mall|\.|,|$)/im
  ]
  
  for (const pattern of namePatterns) {
    const match = allText.match(pattern)
    if (match && match[1] && match[1].trim().length > 2) {
      customerName = match[1].trim()
      break
    }
  }

  // Extract phone - South African format
  const phoneMatch = allText.match(/(0[6-8]\d{8})/)
  if (phoneMatch) {
    customerPhone = phoneMatch[1]
  }

  // Extract delivery location
  if (allText.includes('pep')) {
    deliveryMethod = 'pep'
    const pepMatch = allText.match(/pep\s+(?:store\s+)?([a-z\s]+?)(?:\s+p\d|\.|,|$)/i)
    const codeMatch = allText.match(/p\d{3,}/i)
    if (pepMatch) {
      deliveryLocation = 'PEP Store ' + pepMatch[1].trim()
    }
    if (codeMatch) {
      pepStoreCode = codeMatch[0].toUpperCase()
    }
  } else if (allText.includes('mall')) {
    deliveryMethod = 'mall'
    const mallMatch = allText.match(/([a-z\s]+?)\s+mall/i)
    if (mallMatch) {
      deliveryLocation = mallMatch[1].trim() + ' Mall'
    }
  }

  // If we have enough info, return the details
  if (customerName && customerPhone && deliveryLocation) {
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
    const siteUrl = process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://intandokaziherbal.co.za'
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
    const siteUrl = process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://intandokaziherbal.co.za'
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
    const siteUrl = process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://intandokaziherbal.co.za'
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
    const siteUrl = process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://intandokaziherbal.co.za'
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
