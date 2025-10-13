# 🎯 Multi-Tenant Implementation TODO

## Цель проекта
Позволить каждому пользователю использовать сервер со своими credentials Bitrix24 через HTTP headers.

---

## ✅ Задача 1: Создать helper функцию для получения клиента из args

**Файлы:**
- `src/tools/index.ts`

**Что делать:**
1. Добавить функцию `getClientFromRequest(args: any): Bitrix24Client`
2. Функция должна:
   - Проверить наличие `_bitrix24_webhook` в args
   - Если есть - создать новый `Bitrix24Client(webhook)`
   - Если нет - использовать дефолтный `bitrix24Client`
3. Добавить импорт `Bitrix24Client` class (не только instance)

**Критерии успеха:**
- [ ] Функция `getClientFromRequest` экспортирована
- [ ] Функция корректно создаёт новый client с переданным webhook
- [ ] Функция fallback на дефолтный client если webhook не передан
- [ ] TypeScript компилируется без ошибок

**Код для добавления:**
```typescript
import { Bitrix24Client } from '../bitrix24/client.js';

function getClientFromRequest(args: any): Bitrix24Client {
  if (args._bitrix24_webhook && typeof args._bitrix24_webhook === 'string') {
    return new Bitrix24Client(args._bitrix24_webhook);
  }
  return bitrix24Client; // fallback to default
}
```

---

## ✅ Задача 2: Обновить executeToolCall для использования динамического клиента

**Файлы:**
- `src/tools/index.ts` (строки 1060-1646)

**Что делать:**
1. В начале `executeToolCall` вызвать `const client = getClientFromRequest(args);`
2. Заменить ВСЕ вызовы `bitrix24Client.*` на `client.*`
3. Проверить что замена работает для всех 54 инструментов

**Критерии успеха:**
- [ ] Переменная `client` создаётся в начале функции
- [ ] Все вызовы `bitrix24Client.createContact()` заменены на `client.createContact()`
- [ ] Все вызовы `bitrix24Client.getDeal()` заменены на `client.getDeal()`
- [ ] Все остальные методы (~50 штук) также заменены
- [ ] TypeScript компилируется без ошибок
- [ ] `npm run build` выполняется успешно

**Пример изменения:**
```typescript
// ДО:
const contactId = await bitrix24Client.createContact(contact);

// ПОСЛЕ:
const client = getClientFromRequest(args);
const contactId = await client.createContact(contact);
```

---

## ✅ Задача 3: Обновить http-streamable-server для передачи webhook в args

**Файлы:**
- `http-streamable-server.js` (строки 245-302)

**Что делать:**
1. В обработчике POST `/mcp` извлечь webhook из headers
2. Добавить webhook в `params.arguments` перед вызовом `executeToolCall`
3. Поддержать 3 способа передачи:
   - Header: `X-Bitrix24-Webhook`
   - Query param: `?webhook=...`
   - Body: `params.arguments._bitrix24_webhook`

**Критерии успеха:**
- [ ] Сервер читает header `X-Bitrix24-Webhook`
- [ ] Сервер читает query parameter `webhook`
- [ ] Приоритет: header > query > body
- [ ] Webhook добавляется в `params.arguments._bitrix24_webhook`
- [ ] Если webhook не передан - работает дефолтный из env
- [ ] Сервер запускается без ошибок: `node http-streamable-server.js`

**Код для добавления (после строки 256):**
```javascript
// Extract webhook from request
const webhookFromHeader = req.headers['x-bitrix24-webhook'];
const webhookFromQuery = new URL(req.url, `http://${req.headers.host}`).searchParams.get('webhook');

// Inject webhook into arguments
if (jsonrpcRequest.params && jsonrpcRequest.params.arguments) {
  if (webhookFromHeader) {
    jsonrpcRequest.params.arguments._bitrix24_webhook = webhookFromHeader;
  } else if (webhookFromQuery) {
    jsonrpcRequest.params.arguments._bitrix24_webhook = webhookFromQuery;
  }
}
```

---

## ✅ Задача 4: Собрать и протестировать локально

**Файлы:**
- `package.json`
- `build/` (генерируется)
- `http-streamable-server.js`

**Что делать:**
1. Запустить `npm run build`
2. Запустить `node http-streamable-server.js`
3. Протестировать с разными webhooks:
   - С header
   - С query parameter
   - Без webhook (должен использовать .env)

**Критерии успеха:**
- [ ] `npm run build` выполняется без ошибок
- [ ] Сервер запускается: `node http-streamable-server.js`
- [ ] `/health` возвращает 200 OK
- [ ] Тест с header работает: webhook из header используется
- [ ] Тест с query param работает: webhook из query используется
- [ ] Тест без webhook работает: используется BITRIX24_WEBHOOK_URL из .env

**Команды для теста:**
```bash
# Build
npm run build

# Start server
node http-streamable-server.js

# Test 1: С header
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-Bitrix24-Webhook: https://test.bitrix24.ru/rest/1/test/" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test 2: С query
curl -X POST "http://localhost:3000/mcp?webhook=https://test.bitrix24.ru/rest/1/test/" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test 3: Без webhook (default)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```