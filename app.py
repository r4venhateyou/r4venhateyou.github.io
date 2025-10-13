from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import uuid
from pydub import AudioSegment
import logging
from werkzeug.utils import secure_filename

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# РАСШИРЕННЫЕ НАСТРОЙКИ CORS
CORS(app, 
     origins=['http://localhost:3000', 'http://127.0.0.1:3000', 
              'http://localhost:5000', 'http://127.0.0.1:5000',
              'http://localhost:5500', 'http://127.0.0.1:5500',
              'http://127.0.0.1:5501', 'http://localhost:5501'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'Accept'],
     supports_credentials=True)

# Альтернативно можно разрешить все домены для разработки:
# CORS(app, resources={r"/*": {"origins": "*"}})

# Конфигурация
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024 * 1024 * 1024  # 100MB max file size
ALLOWED_EXTENSIONS = {
    'mp3', 'wav', 'm4a', 'flac', 'aac',  # Аудио
    'mp4', 'avi', 'mov', 'mkv', 'wmv'     # Видео
}

# Загрузка модели Whisper
try:
    logger.info("Loading Whisper model...")
    model = whisper.load_model("small")
    logger.info("Whisper model loaded successfully")
except Exception as e:
    logger.error(f"Error loading Whisper model: {e}")
    model = None

def allowed_file(filename):
    """Проверка расширения файла"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_to_audio(input_path, output_path):
    """Конвертация видео/аудио в MP3"""
    try:
        audio = AudioSegment.from_file(input_path)
        audio.export(output_path, format="mp3", bitrate="128k")
        return True
    except Exception as e:
        logger.error(f"Error converting file: {e}")
        return False

@app.after_request
def after_request(response):
    """Добавляем CORS headers ко всем ответам"""
    response.headers.add('Access-Control-Allow-Origin', 'http://127.0.0.1:5500')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Проверка статуса сервиса"""
    if request.method == 'OPTIONS':
        return '', 200
        
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'message': 'Service is running correctly'
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'Audio/Video to Text Conversion API'})

@app.route('/transcribe', methods=['POST', 'OPTIONS'])
def transcribe():
    """Основной эндпоинт для транскрипции"""
    if request.method == 'OPTIONS':
        return '', 200
    
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    language = request.form.get('language', 'auto')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file or not allowed_file(file.filename):
        return jsonify({
            'error': 'Invalid file type. Allowed types: ' + ', '.join(ALLOWED_EXTENSIONS)
        }), 400

    # Создаём временные файлы
    temp_input = None
    temp_audio = None
    
    try:
        # Сохраняем оригинальный файл
        temp_input = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}_{secure_filename(file.filename)}")
        file.save(temp_input)
        logger.info(f"File saved to: {temp_input}")

        # Конвертируем в аудио если нужно
        temp_audio = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.mp3")
        
        if not convert_to_audio(temp_input, temp_audio):
            return jsonify({'error': 'Failed to convert file to audio'}), 500

        # Проверяем размер аудио файла
        file_size = os.path.getsize(temp_audio)
        if file_size == 0:
            return jsonify({'error': 'Converted audio file is empty'}), 500

        logger.info(f"Audio file size: {file_size} bytes")

        # Транскрибируем с помощью Whisper
        logger.info("Starting transcription...")
        
        if language == 'auto':
            result = model.transcribe(temp_audio)
        else:
            result = model.transcribe(temp_audio, language=language)
        
        logger.info("Transcription completed successfully")
        
        return jsonify({
            'text': result['text'].strip(),
            'language': result.get('language', 'unknown'),
            'duration': round(result.get('duration', 0), 2)
        })

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500

    finally:
        # Очистка временных файлов
        for temp_file in [temp_input, temp_audio]:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                    logger.info(f"Cleaned up: {temp_file}")
                except Exception as e:
                    logger.warning(f"Failed to clean up {temp_file}: {e}")

@app.route('/sample', methods=['GET', 'OPTIONS'])
def get_sample_transcription():
    """Эндпоинт для демо-транскрипции"""
    if request.method == 'OPTIONS':
        return '', 200
        
    sample_text = """SAMPLE TRANSCRIPTION - This is a demonstration of transcription service.

[00:00:00] Welcome to our audio transcription service. This sample demonstrates the high-quality text conversion.

[00:00:15] Our advanced speech recognition technology can handle various accents and background conditions.

[00:00:30] The system automatically detects speaker changes and adds proper punctuation."""

    return jsonify({
        'text': sample_text,
        'language': 'en',
        'duration': 45.0,
        'is_sample': True
    })

# Добавляем обработчик для всех OPTIONS запросов
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://127.0.0.1:5500')
        response.headers.add('Access-Control-Allow-Headers', '*')
        response.headers.add('Access-Control-Allow-Methods', '*')
        return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)