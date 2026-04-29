// Simulasi ringan untuk parser native flow dan owner PN/LID.
import assert from 'node:assert/strict';
import { parseIncomingMessage } from '../src/core/parser.js';
import { requireOwner } from '../src/utils/owner.js';

const config = {
  bot: { prefix: '.' },
  owner: {
    numbers: ['6281234567890'],
    lids: ['111222333@lid']
  }
};

const quickReply = parseIncomingMessage({
  key: { id: 'MSG1', remoteJid: '6281000000000@s.whatsapp.net' },
  message: {
    interactiveResponseMessage: {
      nativeFlowResponseMessage: {
        name: 'quick_reply',
        paramsJson: JSON.stringify({ id: 'menu:status', display_text: 'Status' })
      }
    }
  }
}, config);
assert.equal(quickReply.buttonId, 'menu:status');

const singleSelect = parseIncomingMessage({
  key: { id: 'MSG2', remoteJid: '6281000000000@s.whatsapp.net' },
  message: {
    interactiveResponseMessage: {
      nativeFlowResponseMessage: {
        name: 'single_select',
        paramsJson: JSON.stringify({ selected_row_id: 'dynamic:topup', title: 'Top Up' })
      }
    }
  }
}, config);
assert.equal(singleSelect.buttonId, 'dynamic:topup');

const ctaCopy = parseIncomingMessage({
  key: { id: 'MSG3', remoteJid: '6281000000000@s.whatsapp.net' },
  message: {
    interactiveResponseMessage: {
      nativeFlowResponseMessage: {
        name: 'cta_copy',
        paramsJson: JSON.stringify({ copy_code: 'INV-123' })
      }
    }
  }
}, config);
assert.equal(ctaCopy.buttonId, 'INV-123');

assert.equal(requireOwner({ config, userJid: '6281234567890@s.whatsapp.net' }), true);
assert.equal(requireOwner({ config, userJid: '111222333@lid' }), true);
assert.equal(requireOwner({ config, userJid: '6289999999999@s.whatsapp.net' }), false);

console.log('Parser dan owner simulation OK');
