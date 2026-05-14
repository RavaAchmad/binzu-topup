import { interactiveMsg } from '../lib/buttons.js'
import {
  ORDER_STATUSES,
  buildOrderConfirmation,
  buildOrderCreatedMessage,
  buildOrderIntro,
  buildProductList,
  buildTargetPrompt,
  buildVariantList,
  clearCommerceSession,
  createOrderFromSession,
  getCommerceStore,
  getCommerceSession,
  setCommerceSession
} from '../lib/commerce-service.js'
import { getProduct, getVariant, normalizeCatalogId } from '../lib/commerce-catalog.js'

let handler = async (m, { conn, args, usedPrefix }) => {
  getCommerceStore(global.db)
  const action = normalizeCatalogId(args[0])
  let view

  if (!action) {
    view = buildOrderIntro(usedPrefix)
  } else if (action === 'cancel') {
    clearCommerceSession(m.sender, global.db)
    view = {
      text: '*ORDER DRAFT CANCELLED*\n\nDraft order aktif sudah dibatalkan.',
      footer: 'Binzu-topup Commerce',
      buttons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({ display_text: 'Order Menu', id: `${usedPrefix}order` })
        }
      ]
    }
  } else if (action === 'product') {
    view = buildVariantList(usedPrefix, args[1])
  } else if (action === 'variant') {
    view = await handleVariantSelection(m, usedPrefix, args[1], args[2])
  } else if (action === 'confirm') {
    const result = createOrderFromSession(m.sender, global.db)
    view = result.error
      ? {
          text: `*ORDER CONFIRMATION*\n\n${result.error}`,
          footer: 'Binzu-topup Commerce',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: 'Order Menu', id: `${usedPrefix}order` })
            }
          ]
        }
      : buildOrderCreatedMessage(result.order, usedPrefix)
  } else {
    view = buildProductList(usedPrefix, action)
  }

  return interactiveMsg(conn, m.chat, {
    text: view.text,
    footer: view.footer,
    interactiveButtons: view.buttons,
    mentions: [m.sender]
  }, m)
}

handler.before = async function (m, { conn, usedPrefix }) {
  const session = getCommerceSession(m.sender, global.db)
  if (!session || session.state !== 'awaiting_target') return false

  const text = String(m.text || '').trim()
  if (!text) return false
  if (isLikelyCommand(text, usedPrefix, conn)) return false

  const product = getProduct(session.productId)
  const variant = getVariant(session.productId, session.variantId)
  if (!product || !variant) {
    clearCommerceSession(m.sender, global.db)
    await m.reply('Draft order tidak valid. Silakan mulai ulang dengan .order.')
    return true
  }

  setCommerceSession(m.sender, {
    state: ORDER_STATUSES.PENDING_CONFIRMATION,
    productId: product.id,
    variantId: variant.id,
    target: text,
    chatId: m.chat,
    createdAt: session.createdAt || Date.now()
  }, global.db)

  const view = buildOrderConfirmation(usedPrefix, {
    productId: product.id,
    variantId: variant.id,
    target: text
  })

  await interactiveMsg(conn, m.chat, {
    text: view.text,
    footer: view.footer,
    interactiveButtons: view.buttons,
    mentions: [m.sender]
  }, m)
  return true
}

async function handleVariantSelection(m, usedPrefix, productId, variantId) {
  const product = getProduct(productId)
  const variant = getVariant(productId, variantId)

  if (!product || !variant) {
    return {
      text: '*PACKAGE NOT FOUND*\n\nProduk atau paket tidak ditemukan. Pilih ulang dari katalog.',
      footer: 'Binzu-topup Commerce',
      buttons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({ display_text: 'Order Menu', id: `${usedPrefix}order` })
        }
      ]
    }
  }

  if (product.requiresTargetInput) {
    setCommerceSession(m.sender, {
      state: 'awaiting_target',
      productId: product.id,
      variantId: variant.id,
      chatId: m.chat,
      createdAt: Date.now()
    }, global.db)
    return buildTargetPrompt(usedPrefix, product.id, variant.id)
  }

  setCommerceSession(m.sender, {
    state: ORDER_STATUSES.PENDING_CONFIRMATION,
    productId: product.id,
    variantId: variant.id,
    target: m.sender,
    chatId: m.chat,
    createdAt: Date.now()
  }, global.db)
  return buildOrderConfirmation(usedPrefix, {
    productId: product.id,
    variantId: variant.id,
    target: m.sender
  })
}

function isLikelyCommand(text, usedPrefix, conn) {
  if (usedPrefix && text.startsWith(usedPrefix)) return true
  const prefix = conn?.prefix || global.prefix
  if (prefix instanceof RegExp) return prefix.test(text)
  if (typeof prefix === 'string') return text.startsWith(prefix)
  if (Array.isArray(prefix)) return prefix.some(item => item instanceof RegExp ? item.test(text) : text.startsWith(String(item)))
  return false
}

handler.help = ['order', 'topup']
handler.tags = ['commerce']
handler.command = /^(order|topup)$/i
handler.register = false

export default handler
