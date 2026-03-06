// Универсальный маппинг названий колонок к статусам задач
// Добавляйте сюда новые названия, чтобы они автоматически корректно маппились на статусы

export const COLUMN_STATUS_MAPPING: Record<string, string> = {
  // Статус "done" (Готово)
  'готово': 'done',
  'done': 'done',
  'completed': 'done',
  'завершено': 'done',
  'сделано': 'done',
  
  // Статус "review" (На проверке)
  'на проверке': 'review',
  'review': 'review',
  'testing': 'review',
  'тестирование': 'review',
  'на ревью': 'review',
  'code review': 'review',
  'qa': 'review',
  'контроль качества': 'review',
  
  // Статус "in_progress" (В работе)
  'в работе': 'in_progress',
  'in progress': 'in_progress',
  'in_progress': 'in_progress',
  'разработка': 'in_progress',
  'development': 'in_progress',
  'в процессе': 'in_progress',
  'активные': 'in_progress',
  'doing': 'in_progress',
  
  // Статус "todo" (В планах) - по умолчанию для всех остальных
  'в планах': 'todo',
  'todo': 'todo',
  'to do': 'todo',
  'запланировано': 'todo',
  'очередь': 'todo',
  'backlog': 'todo',
  'открыто': 'todo',
  'new': 'todo',
  'новая': 'todo',
};

/**
 * Обратный маппинг: из системного статуса в красивое название
 */
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  'todo': 'В планах',
  'in_progress': 'В работе',
  'review': 'На проверке',
  'done': 'Готово',
  // Для обратной совместимости
  'в планах': 'В планах',
  'в работе': 'В работе',
  'на проверке': 'На проверке',
  'готово': 'Готово',
};

/**
 * Получает статус по названию колонки
 * @param columnName - Название колонки
 * @returns Системный статус задачи или 'todo' по умолчанию
 */
export function getStatusByColumnName(columnName: string): string {
  if (!columnName) return 'todo';
  
  const normalized = columnName.toLowerCase().trim();
  return COLUMN_STATUS_MAPPING[normalized] || 'todo';
}

/**
 * Получает отображаемое название по системному статусу
 * @param status - Системный статус (например, 'review')
 * @param defaultName - Название по умолчанию (если не найдено в маппинге)
 * @returns Отображаемое название (например, 'На проверке')
 */
export function getDisplayNameByStatus(status: string, defaultName: string = 'В планах'): string {
  if (!status) return defaultName;
  
  const normalized = status.toLowerCase().trim();
  return STATUS_DISPLAY_NAMES[normalized] || defaultName;
}

/**
 * Проверяет соответствие статуса задали названию колонки
 * @param columnName - Название колонки
 * @param status - Текущий статус задачи
 * @returns true, если статус соответствует колонке
 */
export function isStatusMatchingColumn(columnName: string, status: string): boolean {
  const expectedStatus = getStatusByColumnName(columnName);
  return status === expectedStatus;
}
