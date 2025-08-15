const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot('8099453486:AAFxEK9_h30wTzdppYUrXT0MNhfMId0kOS4', { polling: true });

const userState = {};
const admins = [7565599024];
let groupsData = {
  truck: [],
  pick_up: [],
  pending: []
};
let botId;

async function init() {
  try {
    const me = await bot.getMe();
    botId = me.id;
    loadGroups();
  } catch (error) {
    console.error('Error initializing bot:', error);
  }
}

init();

function loadGroups() {
  if (fs.existsSync('groups.json')) {
    const data = fs.readFileSync('groups.json', 'utf8');
    groupsData = JSON.parse(data);
  } else {
    // Initial groups from the original code, assigned to types with company as empty
    groupsData = {
      truck: [
        { name: 'KG caravan #500', company: '', chatId: '-1002714791863', active: true }
      ],
      pick_up: [
        { name: 'Pick up 2', company: '', chatId: '-4924182018', active: true }
      ],
      truck: groupsData.truck.concat([{ name: '#Group2_1', company: '', chatId: '-1001234567892', active: true }]), // Assuming category2 as truck, adjust if needed
      pending: []
    };
    saveGroups();
  }
}

function saveGroups() {
  fs.writeFileSync('groups.json', JSON.stringify(groupsData, null, 2));
}

function restartBot() {
  setTimeout(() => {
    console.log('Restarting bot...');
    bot.stopPolling().then(() => {
      bot.startPolling();
    }).catch(err => {
      console.error('Error stopping polling:', err);
    });
  }, 2000);
}

// Listen for bot joining new groups
bot.on('new_chat_members', (msg) => {
  try {
    const chatIdStr = msg.chat.id.toString();
    for (const member of msg.new_chat_members) {
      if (member.id === botId) {
        const allGroups = [...groupsData.truck, ...groupsData.pick_up];
        if (!allGroups.some(g => g.chatId === chatIdStr) && !groupsData.pending.some(p => p.chatId === chatIdStr)) {
          groupsData.pending.push({ chatId: chatIdStr });
          saveGroups();
          admins.forEach(admin => {
            bot.sendMessage(admin, `Bot joined new group: ${chatIdStr}. Add it in the admin panel.`);
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error in new_chat_members handler:', error);
  }
});

bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userState[userId]?.step === 'enter_message') {
      const selectedChatIds = userState[userId].selectedChatIds;

      try {
        for (const targetChatId of selectedChatIds) {
          if (msg.text) {
            await bot.sendMessage(targetChatId, msg.text);
          } else if (msg.photo) {
            const photoId = msg.photo[msg.photo.length - 1].file_id;
            await bot.sendPhoto(targetChatId, photoId, { caption: msg.caption || '' });
          } else if (msg.document) {
            await bot.sendDocument(targetChatId, msg.document.file_id, { caption: msg.caption || '' });
          } else if (msg.video) {
            await bot.sendVideo(targetChatId, msg.video.file_id, { caption: msg.caption || '' });
          } else if (msg.audio) {
            await bot.sendAudio(targetChatId, msg.audio.file_id, { caption: msg.caption || '' });
          }
        }
        await bot.sendMessage(chatId, 'Xabar muvaffaqiyatli yuborildi!');
      } catch (error) {
        await bot.sendMessage(chatId, 'Xabar yuborishda xato yuz berdi. Guruh chat_id sini tekshiring.');
        console.error('Error sending message to group:', error);
      }
      delete userState[userId];
      return;
    }

    // Admin add group steps (text inputs)
    if (userState[userId]?.step === 'add_group_id') {
      userState[userId].groupId = msg.text.trim();
      userState[userId].step = 'add_group_name';
      await bot.sendMessage(chatId, 'Enter group name:');
      return;
    }

    if (userState[userId]?.step === 'add_group_name') {
      userState[userId].name = msg.text.trim();
      userState[userId].step = 'add_company';
      await bot.sendMessage(chatId, 'Enter company name:');
      return;
    }

    if (userState[userId]?.step === 'add_company') {
      userState[userId].company = msg.text.trim();
      userState[userId].step = 'add_type';
      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Truck', callback_data: 'add_type_truck' }],
            [{ text: 'Pick Up', callback_data: 'add_type_pick_up' }]
          ]
        }
      };
      await bot.sendMessage(chatId, 'Select type:', options);
      return;
    }

    // Assign pending group steps
    if (userState[userId]?.step === 'assign_name') {
      userState[userId].name = msg.text.trim();
      userState[userId].step = 'assign_company';
      await bot.sendMessage(chatId, 'Enter company name:');
      return;
    }

    if (userState[userId]?.step === 'assign_company') {
      userState[userId].company = msg.text.trim();
      userState[userId].step = 'assign_type';
      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Truck', callback_data: 'assign_type_truck' }],
            [{ text: 'Pick Up', callback_data: 'assign_type_pick_up' }]
          ]
        }
      };
      await bot.sendMessage(chatId, 'Select type:', options);
      return;
    }

  } catch (error) {
    console.error('Error in message handler:', error);
    await bot.sendMessage(msg.chat.id, 'Xato yuz berdi. Iltimos, qayta urinib ko‘ring.');
    restartBot();
  }
});

bot.on('callback_query', async (callbackQuery) => {
  try {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Sending messages categories
    if (['truck', 'pick_up'].includes(data)) {
      const category = data;
      const activeGroups = groupsData[category].filter(g => g.active);
      const numGroups = activeGroups.length;
      if (numGroups === 0) {
        await bot.sendMessage(chatId, `No active groups in ${category}.`);
        return;
      }
      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Ha', callback_data: `all_${category}` }],
            [{ text: 'Yo\'q', callback_data: `select_${category}` }]
          ]
        }
      };
      await bot.sendMessage(chatId, `${category} (${numGroups} ta guruh) ga hammasiga yuborishni xohlaysizmi?`, options);
      return;
    }

    if (data.startsWith('all_')) {
      const category = data.split('_')[1];
      const activeGroups = groupsData[category].filter(g => g.active);
      const selectedChatIds = activeGroups.map(g => g.chatId);
      userState[userId] = { step: 'enter_message', selectedChatIds };
      await bot.sendMessage(chatId, 'Yubormoqchi bo‘lgan xabarni kiriting (matn yoki rasm):');
      return;
    }

    if (data.startsWith('select_')) {
      const category = data.split('_')[1];
      userState[userId] = { step: 'select_groups', category };
      const activeGroups = groupsData[category].filter(g => g.active);
      if (activeGroups.length === 0) {
        await bot.sendMessage(chatId, `No active groups in ${category}.`);
        return;
      }
      const options = {
        reply_markup: {
          inline_keyboard: activeGroups.map(group => [{ text: `${group.name} (${group.company})`, callback_data: `group_${group.chatId}` }])
        }
      };
      await bot.sendMessage(chatId, 'Xabar yubormoqchi bo‘lgan guruh(lar)ni tanlang:', options);
      return;
    }

    if (data.startsWith('group_') && userState[userId]?.step === 'select_groups') {
      const selectedChatId = data.split('_')[1];
      const category = userState[userId].category;
      if (groupsData[category].some(g => g.chatId === selectedChatId && g.active)) {
        userState[userId] = { step: 'enter_message', selectedChatIds: [selectedChatId] };
        await bot.sendMessage(chatId, 'Yubormoqchi bo‘lgan xabarni kiriting (matn yoki rasm):');
      }
      return;
    }

    // Admin panel callbacks
    if (data === 'admin_add') {
      userState[userId] = { step: 'add_group_id' };
      await bot.sendMessage(chatId, 'Enter group chat_id:');
      return;
    }

    if (data.startsWith('add_type_') && userState[userId]?.step === 'add_type') {
      const type = data.split('_')[2];
      groupsData[type].push({
        name: userState[userId].name,
        company: userState[userId].company,
        chatId: userState[userId].groupId,
        active: true
      });
      saveGroups();
      await bot.sendMessage(chatId, 'Group added successfully!');
      delete userState[userId];
      return;
    }

    if (data === 'admin_pending') {
      if (groupsData.pending.length === 0) {
        await bot.sendMessage(chatId, 'No pending groups.');
        return;
      }
      const keyboard = groupsData.pending.map(p => [{ text: p.chatId, callback_data: `assign_${p.chatId}` }]);
      await bot.sendMessage(chatId, 'Pending groups:', { reply_markup: { inline_keyboard: keyboard } });
      return;
    }

    if (data.startsWith('assign_')) {
      const pendChatId = data.split('_')[1];
      userState[userId] = { step: 'assign_name', pendChatId };
      await bot.sendMessage(chatId, `Enter group name for ${pendChatId}:`);
      return;
    }

    if (data.startsWith('assign_type_') && userState[userId]?.step === 'assign_type') {
      const type = data.split('_')[2];
      const pendChatId = userState[userId].pendChatId;
      groupsData.pending = groupsData.pending.filter(p => p.chatId !== pendChatId);
      groupsData[type].push({
        name: userState[userId].name,
        company: userState[userId].company,
        chatId: pendChatId,
        active: true
      });
      saveGroups();
      await bot.sendMessage(chatId, 'Pending group assigned successfully!');
      delete userState[userId];
      return;
    }

    if (data === 'admin_list') {
      const types = ['truck', 'pick_up'];
      for (const type of types) {
        const groupList = groupsData[type].map(g => `${g.name} (${g.company}) - ${g.chatId} ${g.active ? '(active)' : '(inactive)'} [${g.active ? 'Deactivate' : 'Activate'}]`).join('\n');
        if (groupList) {
          await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} groups:\n${groupList}`);
        } else {
          await bot.sendMessage(chatId, `No groups in ${type}.`);
        }
      }
      // For deactivation, add buttons per group in a separate message or enhance
      const keyboard = [];
      types.forEach(type => {
        groupsData[type].forEach(g => {
          keyboard.push([{ text: `${g.name} (${type}) - ${g.active ? 'Deactivate' : 'Activate'}`, callback_data: `toggle_active_${type}_${g.chatId}` }]);
        });
      });
      if (keyboard.length > 0) {
        await bot.sendMessage(chatId, 'Manage group status:', { reply_markup: { inline_keyboard: keyboard } });
      }
      return;
    }

    if (data.startsWith('toggle_active_')) {
      const [, type, groupChatId] = data.split('_');
      const group = groupsData[type].find(g => g.chatId === groupChatId);
      if (group) {
        group.active = !group.active;
        saveGroups();
        await bot.sendMessage(chatId, `Group ${group.name} is now ${group.active ? 'active' : 'inactive'}.`);
      }
      return;
    }

  } catch (error) {
    console.error('Error in callback query handler:', error);
    await bot.sendMessage(callbackQuery.message.chat.id, 'Xato yuz berdi. Iltimos, qayta urinib ko‘ring.');
    restartBot();
  }
});

bot.onText(/\/sendmessages/, (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!admins.includes(userId)) {
      bot.sendMessage(chatId, 'Sizda bu buyruqni ishlatish uchun ruxsat yo‘q.');
      return;
    }

    const truckCount = groupsData.truck.filter(g => g.active).length;
    const pickUpCount = groupsData.pick_up.filter(g => g.active).length;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: `Truck (${truckCount} guruh)`, callback_data: 'truck' }],
          [{ text: `Pick Up (${pickUpCount} guruh)`, callback_data: 'pick_up' }]
        ]
      }
    };
    bot.sendMessage(chatId, 'Qaysi toifadagi guruhlarga xabar yubormoqchisiz?', options);
  } catch (error) {
    console.error('Error in sendmessages command:', error);
    bot.sendMessage(msg.chat.id, 'Xato yuz berdi. Iltimos, qayta urinib ko‘ring.');
    restartBot();
  }
});

bot.onText(/\/admin/, (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!admins.includes(userId)) {
      bot.sendMessage(chatId, 'Sizda bu buyruqni ishlatish uchun ruxsat yo‘q.');
      return;
    }

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Add new group', callback_data: 'admin_add' }],
          [{ text: 'Pending groups', callback_data: 'admin_pending' }],
          [{ text: 'List groups', callback_data: 'admin_list' }]
        ]
      }
    };
    bot.sendMessage(chatId, 'Admin Panel', options);
  } catch (error) {
    console.error('Error in admin command:', error);
    bot.sendMessage(msg.chat.id, 'Xato yuz berdi. Iltimos, qayta urinib ko‘ring.');
    restartBot();
  }
});

bot.onText(/\/getchatid/, (msg) => {
  try {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Bu guruhning chat_id: ${chatId}`);
  } catch (error) {
    console.error('Error in getchatid command:', error);
    bot.sendMessage(msg.chat.id, 'Xato yuz berdi. Iltimos, qayta urinib ko‘ring.');
    restartBot();
  }
});