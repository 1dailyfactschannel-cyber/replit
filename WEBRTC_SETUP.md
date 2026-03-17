# WebRTC Видеозвонки - Установка

## 1. Настройка TURN сервера (coturn)

### Установка
```bash
sudo apt-get install coturn
```

### Конфигурация `/etc/turnserver.conf`
```ini
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=yourdomain.com
```

### Запуск
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

## 2. Переменные окружения

Создайте файл `.env` в корне проекта:
```
TURN_SERVER=your-turn-server.com
TURN_SERVER_IP=your-server-ip
```

## 3. Проверка

1. Запустите сервер: `npm run dev`
2. Откройте командные залы
3. Присоединитесь к комнате
4. Видео должно начаться автоматически

## 4. Тестовые аккаунты

Для тестирования можно использовать публичные STUN серверы:
- stun.l.google.com:19302
- stun1.l.google.com:19302
