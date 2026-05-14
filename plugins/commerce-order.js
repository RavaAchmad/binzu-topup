import { interactiveMsg } from '../lib/buttons.js'
import { buildOrderIntro, getCommerceStore } from '../lib/commerce-service.js'

let handler = async (m, { conn, args, usedPrefix }) => {
  getCommerceStore(global.db)
  const view = buildOrderIntro(usedPrefix, args[0])

  return interactiveMsg(conn, m.chat, {
    text: view.text,
    footer: view.footer,
    interactiveButtons: view.buttons,
    mentions: [m.sender]
  }, m)
}

handler.help = ['order', 'topup']
handler.tags = ['commerce']
handler.command = /^(order|topup)$/i
handler.register = false

export default handler
