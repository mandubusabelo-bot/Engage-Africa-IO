export async function sendWhatsApp(
  toNumber: string,
  message: string,
  delayMs = 1200
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'engage-africa'
    const response = await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendText/${instance}`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.EVOLUTION_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: toNumber,
          text: message,
          delay: delayMs
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return { success: true, messageId: data?.key?.id }
  } catch (err: any) {
    console.error('Evolution send failed:', err.message)
    return { success: false, error: err.message }
  }
}

export async function sendPaymentOptionsInteractive(
  toNumber: string,
  orderSummary: string,
  delayMs = 1200
): Promise<{ success: boolean; error?: string }> {
  try {
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'engage-africa'
    const response = await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendList/${instance}`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.EVOLUTION_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: toNumber,
          listMessage: {
            title: '💰 How would you like to pay?',
            description: orderSummary.slice(0, 300),
            footer: 'Intandokazi Herbal Products 🌿',
            buttonText: 'Select Payment Method',
            sections: [
              {
                title: 'Payment Options',
                rows: [
                  {
                    rowId: 'pay_online',
                    title: '💳 Pay Online',
                    description: 'Secure PayFast link — instant confirmation'
                  },
                  {
                    rowId: 'pay_eft',
                    title: '🏦 EFT / Bank Transfer',
                    description: 'Capitec Bank — Miss Mokoatle'
                  },
                  {
                    rowId: 'pay_capitec',
                    title: '📱 Capitec Transfer',
                    description: 'Linked number: 0625842441'
                  }
                ]
              }
            ]
          },
          delay: delayMs
        })
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: err.message || `HTTP ${response.status}` }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Evolution] sendPaymentOptionsInteractive error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function sendWhatsAppImage(
  toNumber: string,
  imageUrl: string,
  caption?: string,
  delayMs = 1200
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'engage-africa'
    const response = await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendMedia/${instance}`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.EVOLUTION_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: toNumber,
          media: imageUrl,
          caption: caption || '',
          delay: delayMs
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return { success: true, messageId: data?.key?.id }
  } catch (err: any) {
    console.error('Evolution send media failed:', err.message)
    return { success: false, error: err.message }
  }
}
