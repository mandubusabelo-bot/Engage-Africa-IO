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

// Check if we have all required info or need to ask for more
export function getMissingInfo(details: Partial<OrderDetails>): string[] {
  const missing: string[] = []
  
  if (!details.customerName) missing.push('full name')
  if (!details.customerPhone) missing.push('cellphone number')
  if (!details.deliveryLocation) missing.push('collection location (PEP store or mall)')
  if (!details.productName) missing.push('which product you want to buy')
  
  return missing
}
