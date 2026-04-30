import { PostgresStorage } from "../server/postgres-storage";
import * as schema from "../shared/schema";

async function seedKnowledgeBase() {
  console.log("Seeding knowledge base...");
  const storage = new PostgresStorage();
  const db = storage.db;

  // Check if already seeded
  const existing = await db.select().from(schema.knowledgeSections);
  if (existing.length > 0) {
    console.log(`Knowledge base already has ${existing.length} sections. Skipping seed.`);
    return;
  }

  const sections = [
    { title: "Авторизация", icon: "Lock", sortOrder: 0, isVisible: true },
    { title: "Главная страница", icon: "LayoutDashboard", sortOrder: 1, isVisible: true },
    { title: "Проекты и Kanban", icon: "Kanban", sortOrder: 2, isVisible: true },
    { title: "Задачи", icon: "CheckSquare", sortOrder: 3, isVisible: true },
    { title: "Календарь", icon: "Calendar", sortOrder: 4, isVisible: true },
    { title: "Чат и звонки", icon: "MessageSquare", sortOrder: 5, isVisible: true },
    { title: "Команда", icon: "Users", sortOrder: 6, isVisible: true },
    { title: "Уведомления", icon: "Bell", sortOrder: 7, isVisible: true },
    { title: "Магазин и баллы", icon: "ShoppingBag", sortOrder: 8, isVisible: true },
    { title: "Отчёты", icon: "BarChart2", sortOrder: 9, isVisible: true },
    { title: "Управление", icon: "Settings", sortOrder: 10, isVisible: true },
    { title: "Профиль", icon: "User", sortOrder: 11, isVisible: true },
  ];

  const createdSections: { id: string; title: string }[] = [];

  for (const s of sections) {
    const result = await db.insert(schema.knowledgeSections).values(s).returning();
    createdSections.push(result[0]);
    console.log(`Created section: ${s.title}`);
  }

  const articles: { sectionId: string; title: string; content: string; sortOrder: number; isVisible: boolean }[] = [
    {
      sectionId: createdSections[0].id,
      title: "Форма входа",
      content: `<p>Страница авторизации (маршрут <code>/auth</code>) — единственная публичная страница приложения.</p>
<h3>Основные элементы</h3>
<ul>
<li><strong>Поле Email</strong> — ввод адреса электронной почты, используемого в качестве логина.</li>
<li><strong>Поле Пароль</strong> — ввод пароля с кнопкой переключения видимости.</li>
<li><strong>Кнопка «Войти»</strong> — отправляет данные на API <code>/api/login</code>.</li>
<li><strong>Восстановление пароля</strong> — ссылка открывает форму сброса пароля по email.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[0].id,
      title: "Регистрация нового пользователя",
      content: `<p>Вкладка «Регистрация» позволяет создать новый аккаунт с указанием email, пароля, имени и фамилии.</p>
<ul>
<li><strong>Создание аккаунта</strong> — форма отправляет данные на API <code>/api/register</code>.</li>
<li><strong>Email</strong> — уникальный адрес электронной почты.</li>
<li><strong>Пароль</strong> — минимальные требования к сложности.</li>
</ul>`,
      sortOrder: 1,
      isVisible: true,
    },
    {
      sectionId: createdSections[1].id,
      title: "Дашборд",
      content: `<p>Главная страница приложения (маршрут <code>/</code>), доступная сразу после авторизации.</p>
<h3>Виджеты</h3>
<ul>
<li><strong>Всего задач</strong> — общее количество задач текущего пользователя.</li>
<li><strong>Выполнено</strong> — количество завершённых задач.</li>
<li><strong>В работе</strong> — задачи в статусе «в процессе».</li>
<li><strong>Эффективность</strong> — процент выполненных задач.</li>
<li><strong>Задачи на сегодня</strong> — таймлайн задач с дедлайном на текущий день.</li>
<li><strong>Загрузка команды</strong> — список сотрудников с прогресс-барами.</li>
<li><strong>Недавние проекты</strong> — компактный список последних проектов.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[2].id,
      title: "Kanban-доска",
      content: `<p>Центральный рабочий инструмент (маршрут <code>/projects</code>). Kanban-доска с drag-and-drop перемещением задач между колонками.</p>
<h3>Возможности</h3>
<ul>
<li>Перетаскивание колонок и задач</li>
<li>Фильтрация и поиск</li>
<li>Спринты и избранное</li>
<li>Детальный просмотр задач</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[3].id,
      title: "Управление задачами",
      content: `<p>Система управления задачами включает создание, редактирование, назначение исполнителей и отслеживание статуса.</p>
<ul>
<li>Создание задачи с заголовком, описанием, дедлайном</li>
<li>Назначение исполнителей и наблюдателей</li>
<li>Приоритеты и метки</li>
<li>Комментарии и вложения</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[4].id,
      title: "Календарь событий",
      content: `<p>Календарь (маршрут <code>/calendar</code>) позволяет планировать события, встречи и дедлайны задач.</p>
<ul>
<li>Режимы просмотра: месяц, неделя, день</li>
<li>Создание событий с напоминаниями</li>
<li>Интеграция с Яндекс Календарём</li>
<li>Перетаскивание событий для изменения времени</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[5].id,
      title: "Чат и комнаты",
      content: `<p>Корпоративный чат (маршрут <code>/chat</code>) с поддержкой личных сообщений, групповых комнат и звонков.</p>
<ul>
<li>Личные переписки</li>
<li>Групповые комнаты с администраторами</li>
<li>Отправка файлов и изображений</li>
<li>Голосовые и видеозвонки</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[6].id,
      title: "Команда и сотрудники",
      content: `<p>Раздел команды (маршрут <code>/team</code>) отображает список всех сотрудников с их статусами, ролями и контактами.</p>
<ul>
<li>Список сотрудников с аватарами и статусами</li>
<li>Фильтрация по отделам и ролям</li>
<li>Просмотр профиля сотрудника</li>
<li>Управление доступами (для админов)</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[7].id,
      title: "Центр уведомлений",
      content: `<p>Уведомления доставляются в реальном времени через WebSocket и отображаются в шапке приложения и на странице <code>/notifications</code>.</p>
<ul>
<li>Типы уведомлений: задачи, чат, календарь, звонки, системные, новости</li>
<li>Мгновенная доставка через Socket.io</li>
<li>Telegram-уведомления (при подключенном боте)</li>
<li>Отметка прочтённым и удаление</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[8].id,
      title: "Магазин и система баллов",
      content: `<p>Магазин (маршрут <code>/shop</code>) позволяет сотрудникам тратить заработанные баллы на различные товары и привилегии.</p>
<ul>
<li>Каталог товаров с изображениями</li>
<li>Баланс баллов и история операций</li>
<li>Правила начисления баллов</li>
<li>Заказ товаров с подтверждением администратора</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[9].id,
      title: "Отчёты и аналитика",
      content: `<p>Раздел отчётов (маршрут <code>/reports</code>) предоставляет аналитику по задачам, проектам и активности команды.</p>
<ul>
<li>Статистика по задачам (создано, выполнено, просрочено)</li>
<li>Загрузка команды по времени</li>
<li>Эффективность по проектам</li>
<li>Экспорт данных</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[10].id,
      title: "Панель управления",
      content: `<p>Панель управления (маршрут <code>/management</code>) доступна только администраторам и позволяет настраивать все аспекты системы.</p>
<ul>
<li>Управление пользователями и ролями</li>
<li>Настройка статусов и отделов</li>
<li>Управление проектами и спринтами</li>
<li>Интеграции (Telegram, Яндекс Календарь)</li>
<li>Новости и объявления</li>
<li>База знаний (CMS)</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: createdSections[11].id,
      title: "Профиль пользователя",
      content: `<p>Профиль (маршрут <code>/profile</code>) позволяет редактировать личные данные, настройки уведомлений и пароль.</p>
<ul>
<li>Редактирование ФИО, аватара, контактов</li>
<li>Настройка уведомлений (email, Telegram, push)</li>
<li>Смена пароля</li>
<li>Просмотр активности и статистики</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
  ];

  for (const a of articles) {
    await db.insert(schema.knowledgeArticles).values(a);
    console.log(`Created article: ${a.title}`);
  }

  console.log(`Knowledge base seeded successfully: ${sections.length} sections, ${articles.length} articles.`);
}

seedKnowledgeBase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
