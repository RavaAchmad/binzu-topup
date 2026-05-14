import { interactiveMsg } from '../lib/buttons.js'
import { buildOrderDetailMessage, buildStatusMessage } from '../lib/commerce-service.js'

let handler = async (m, { conn, args, usedPrefix }) => {
  const view = args[0]
    ? buildOrderDetailMessage(m.sender, args[0], usedPrefix, global.db)
    : buildStatusMessage(m.sender, usedPrefix, global.db)

  return interactiveMsg(conn, m.chat, {
    text: view.text,
    footer: view.footer,
    interactiveButtons: view.buttons,
    mentions: [m.sender]
  }, m)
}

handler.help = ['cekstatus', 'statusorder [orderId|latest]']
handler.tags = ['commerce']
handler.command = /^(cekstatus|statusorder)$/i
handler.register = false

export default handler
