import { interactiveMsg } from '../lib/buttons.js'
import { buildStatusMessage } from '../lib/commerce-service.js'

let handler = async (m, { conn, usedPrefix }) => {
  const view = buildStatusMessage(m.sender, usedPrefix, global.db)

  return interactiveMsg(conn, m.chat, {
    text: view.text,
    footer: view.footer,
    interactiveButtons: view.buttons,
    mentions: [m.sender]
  }, m)
}

handler.help = ['cekstatus', 'statusorder']
handler.tags = ['commerce']
handler.command = /^(cekstatus|statusorder)$/i
handler.register = false

export default handler
