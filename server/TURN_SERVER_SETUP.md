# Настройка TURN сервера (coturn)

## Установка на Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install coturn
```

## Конфигурация

Редактируйте файл `/etc/turnserver.conf`:

```ini
# Порты для TURN
listening-port=3478
tls-listening-port=5349

# Аутентификация
fingerprint
lt-cred-mech
user=username:password
realm=yourdomain.com

# Лимиты
total-quota=100
max-bps=30000000

# Логирование
log-file=/var/log/turnserver.log
verbose
```

## Запуск службы

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
sudo systemctl status coturn
```

## Проверка работы

```bash
# Проверка порта
netstat -tulpn | grep 3478

# Проверка TURN
turnutils_uclient localhost -t -u username -w password
```
