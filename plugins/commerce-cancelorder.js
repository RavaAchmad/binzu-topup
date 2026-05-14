import { interactiveMsg } from '../lib/buttons.js'
import { buildCancelResultMessage, cancelOrder } from '../lib/commerce-service.js'

let handler = async (m, { conn, args, usedPrefix }) => {
  const orderId = args[0]
  const view = orderId
    ? buildCancelResultMessage(cancelOrder(m.sender, orderId, global.db), usedPrefix)
    : {
        text: [
          '*CANCEL ORDER*',
          '',
          `Gunakan: ${usedPrefix}cancelorder <orderId>`,
          `Cek order kamu dengan ${usedPrefix}cekstatus.`
        ].join('\n'),
        footer: 'Binzu-topup Commerce',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: 'Check Status', id: `${usedPrefix}cekstatus` })
          }
        ]
      }

  return interactiveMsg(conn, m.chat, {
    text: view.text,
    footer: view.footer,
    interactiveButtons: view.buttons,
    mentions: [m.sender]
  }, m)
}

handler.help = ['cancelorder <orderId>']
handler.tags = ['commerce']
handler.command = /^(cancelorder|batalorder)$/i
handler.register = false

export default handler
