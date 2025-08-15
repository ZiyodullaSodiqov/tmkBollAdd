# from telegram import Update
# from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
# from PIL import Image
# import os

# TOKEN = '8321881399:AAGzzAl6lrb35SymiuNz7LYGc3_Y11lZEw8'  # Bu yerni o'z bot tokeningiz bilan almashtiring

# def start(update: Update, context: CallbackContext) -> None:
#     update.message.reply_text('Menga rasm yuboring, men uni PDF ga aylantiraman.')

# def handle_photo(update: Update, context: CallbackContext) -> None:
#     photo_file = update.message.photo[-1].get_file()
#     photo_file.download('image.jpg')
#     image = Image.open('image.jpg')
#     pdf_path = 'output.pdf'
#     image.convert('RGB').save(pdf_path)
#     context.bot.send_document(chat_id=update.effective_chat.id, document=open(pdf_path, 'rb'))
#     os.remove('image.jpg')
#     os.remove(pdf_path)

# def main() -> None:
#     updater = Updater(TOKEN)
#     updater.dispatcher.add_handler(CommandHandler('start', start))
#     updater.dispatcher.add_handler(MessageHandler(Filters.photo, handle_photo))
#     updater.start_polling()
#     updater.idle()

# if __name__ == '__main__':
#     main()

import pytesseract

async def handle_photo(update: Update, context) -> None:
    try:
        photo_file = await update.message.photo[-1].get_file()
        await photo_file.download_to_drive('image.jpg')
        image = Image.open('image.jpg')
        
        # Extract text using OCR
        text = pytesseract.image_to_string(image, lang='uzb')  # 'uzb' for Uzbek, change if needed
        await update.message.reply_text(f"Matn: {text}")
        
        # Convert to PDF
        pdf_path = 'output.pdf'
        image.convert('RGB').save(pdf_path)
        await context.bot.send_document(chat_id=update.effective_chat.id, document=open(pdf_path, 'rb'))
    except Exception as e:
        await update.message.reply_text(f"Xatolik yuz berdi: {str(e)}")
    finally:
        for file in ['image.jpg', 'output.pdf']:
            if os.path.exists(file):
                os.remove(file)