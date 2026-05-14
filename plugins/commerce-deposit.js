import { interactiveMsg } from '../lib/buttons.js'
import { buildDepositIntro, getCommerceStore } from '../lib/commerce-service.js'

let handler = async (m, { conn, usedPrefix }) => {
  getCommerceStore(global.db)
  const view = buildDepositIntro(usedPrefix)

  return interactiveMsg(conn, m.chat, {
    text: view.text,
    footer: view.footer,
    interactiveButtons: view.buttons,
    mentions: [m.sender]
  }, m)
}

handler.help = ['deposit']
handler.tags = ['commerce']
handler.command = /^deposit$/i
handler.register = false

export default handler
