import { PostgresStorage } from "../server/postgres-storage";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateKnowledgeBase() {
  console.log("Updating knowledge base articles with icons...");
  const storage = new PostgresStorage();
  const db = storage.db;

  // Get existing sections
  const existingSections = await db.select().from(schema.knowledgeSections);
  if (existingSections.length === 0) {
    console.log("No existing sections found. Run seed-knowledge-base.ts first.");
    process.exit(1);
  }

  const sectionMap = new Map(existingSections.map(s => [s.title, s]));

  // Delete existing articles
  await db.delete(schema.knowledgeArticles);
  console.log("Deleted existing articles.");

  const articles: { sectionId: string; title: string; content: string; sortOrder: number; isVisible: boolean }[] = [
    {
      sectionId: sectionMap.get("Авторизация")!.id,
      title: "Форма входа",
      content: `<p>Страница авторизации (маршрут <code>/auth</code>) — единственная публичная страница приложения.</p>
<h3>Основные элементы</h3>
<ul>
<li><span data-icon="Mail"></span><strong>Поле Email</strong> — ввод адреса электронной почты, используемого в качестве логина.</li>
<li><span data-icon="Key"></span><strong>Поле Пароль</strong> — ввод пароля с кнопкой переключения видимости.</li>
<li><span data-icon="Check"></span><strong>Кнопка «Войти»</strong> — отправляет данные на API <code>/api/login</code>.</li>
<li><span data-icon="RefreshCw"></span><strong>Восстановление пароля</strong> — ссылка открывает форму сброса пароля по email.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Авторизация")!.id,
      title: "Регистрация нового пользователя",
      content: `<p>Вкладка «Регистрация» позволяет создать новый аккаунт с указанием email, пароля, имени и фамилии.</p>
<ul>
<li><span data-icon="UserPlus"></span><strong>Создание аккаунта</strong> — форма отправляет данные на API <code>/api/register</code>.</li>
<li><span data-icon="Mail"></span><strong>Email</strong> — уникальный адрес электронной почты.</li>
<li><span data-icon="Key"></span><strong>Пароль</strong> — минимальные требования к сложности.</li>
</ul>`,
      sortOrder: 1,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Главная страница")!.id,
      title: "Дашборд",
      content: `<p>Главная страница приложения (маршрут <code>/</code>), доступная сразу после авторизации.</p>
<h3>Виджеты</h3>
<ul>
<li><span data-icon="LayoutDashboard"></span><strong>Всего задач</strong> — общее количество задач текущего пользователя.</li>
<li><span data-icon="Check"></span><strong>Выполнено</strong> — количество завершённых задач.</li>
<li><span data-icon="Clock"></span><strong>В работе</strong> — задачи в статусе «в процессе».</li>
<li><span data-icon="TrendingUp"></span><strong>Эффективность</strong> — процент выполненных задач.</li>
<li><span data-icon="Calendar"></span><strong>Задачи на сегодня</strong> — таймлайн задач с дедлайном на текущий день.</li>
<li><span data-icon="Users"></span><strong>Загрузка команды</strong> — список сотрудников с прогресс-барами.</li>
<li><span data-icon="FolderOpen"></span><strong>Недавние проекты</strong> — компактный список последних проектов.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Проекты и Kanban")!.id,
      title: "Kanban-доска",
      content: `<p>Центральный рабочий инструмент (маршрут <code>/projects</code>). Kanban-доска с drag-and-drop перемещением задач между колонками.</p>
<h3>Возможности</h3>
<ul>
<li><span data-icon="LayoutGrid"></span><strong>Перетаскивание</strong> — перемещение колонок и задач мышью.</li>
<li><span data-icon="Search"></span><strong>Фильтрация и поиск</strong> — быстрый поиск по названию, исполнителю или метке.</li>
<li><span data-icon="Flag"></span><strong>Спринты и избранное</strong> — группировка задач по спринтам и приоритетам.</li>
<li><span data-icon="ListChecks"></span><strong>Детальный просмотр</strong> — полная информация о задаче в модальном окне.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Задачи")!.id,
      title: "Управление задачами",
      content: `<p>Система управления задачами включает создание, редактирование, назначение исполнителей и отслеживание статуса.</p>
<ul>
<li><span data-icon="Plus"></span><strong>Создание задачи</strong> — заголовок, описание, дедлайн и приоритет.</li>
<li><span data-icon="Users"></span><strong>Назначение</strong> — исполнители и наблюдатели.</li>
<li><span data-icon="Tags"></span><strong>Приоритеты и метки</strong> — цветовые метки для быстрой идентификации.</li>
<li><span data-icon="Paperclip"></span><strong>Вложения</strong> — прикрепление файлов и комментариев.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Календарь")!.id,
      title: "Календарь событий",
      content: `<p>Календарь (маршрут <code>/calendar</code>) позволяет планировать события, встречи и дедлайны задач.</p>
<ul>
<li><span data-icon="Calendar"></span><strong>Режимы просмотра</strong> — месяц, неделя, день.</li>
<li><span data-icon="Plus"></span><strong>Создание событий</strong> — с напоминаниями и приглашениями.</li>
<li><span data-icon="Globe"></span><strong>Интеграция</strong> — синхронизация с Яндекс Календарём.</li>
<li><span data-icon="RefreshCw"></span><strong>Перетаскивание</strong> — изменение времени события мышью.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Чат и звонки")!.id,
      title: "Чат и комнаты",
      content: `<p>Корпоративный чат (маршрут <code>/chat</code>) с поддержкой личных сообщений, групповых комнат и звонков.</p>
<ul>
<li><span data-icon="MessageSquare"></span><strong>Личные переписки</strong> — быстрый обмен сообщениями.</li>
<li><span data-icon="Users"></span><strong>Групповые комнаты</strong> — с администраторами и правами доступа.</li>
<li><span data-icon="Paperclip"></span><strong>Файлы и изображения</strong> — отправка вложений прямо в чат.</li>
<li><span data-icon="Video"></span><strong>Голосовые и видеозвонки</strong> — встроенная система звонков.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Команда")!.id,
      title: "Команда и сотрудники",
      content: `<p>Раздел команды (маршрут <code>/team</code>) отображает список всех сотрудников с их статусами, ролями и контактами.</p>
<ul>
<li><span data-icon="Users"></span><strong>Список сотрудников</strong> — аватары, статусы и онлайн-индикаторы.</li>
<li><span data-icon="Filter"></span><strong>Фильтрация</strong> — по отделам, ролям и статусам.</li>
<li><span data-icon="User"></span><strong>Профиль сотрудника</strong> — контакты, навыки и активность.</li>
<li><span data-icon="Shield"></span><strong>Управление доступами</strong> — для администраторов.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Уведомления")!.id,
      title: "Центр уведомлений",
      content: `<p>Уведомления доставляются в реальном времени через WebSocket и отображаются в шапке приложения и на странице <code>/notifications</code>.</p>
<ul>
<li><span data-icon="Bell"></span><strong>Типы уведомлений</strong> — задачи, чат, календарь, звонки, системные.</li>
<li><span data-icon="Zap"></span><strong>Мгновенная доставка</strong> — через Socket.io без перезагрузки страницы.</li>
<li><span data-icon="Send"></span><strong>Telegram-бот</strong> — дублирование уведомлений в мессенджер.</li>
<li><span data-icon="Check"></span><strong>Управление</strong> — отметка прочитанным и удаление.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Магазин и баллы")!.id,
      title: "Магазин и система баллов",
      content: `<p>Магазин (маршрут <code>/shop</code>) позволяет сотрудникам тратить заработанные баллы на различные товары и привилегии.</p>
<ul>
<li><span data-icon="Store"></span><strong>Каталог товаров</strong> — с изображениями и описаниями.</li>
<li><span data-icon="Coins"></span><strong>Баланс баллов</strong> — история начислений и списаний.</li>
<li><span data-icon="ListChecks"></span><strong>Правила начисления</strong> — за выполнение задач и активность.</li>
<li><span data-icon="ShoppingBag"></span><strong>Заказ товаров</strong> — с подтверждением администратора.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Отчёты")!.id,
      title: "Отчёты и аналитика",
      content: `<p>Раздел отчётов (маршрут <code>/reports</code>) предоставляет аналитику по задачам, проектам и активности команды.</p>
<ul>
<li><span data-icon="BarChart2"></span><strong>Статистика задач</strong> — создано, выполнено, просрочено.</li>
<li><span data-icon="Users"></span><strong>Загрузка команды</strong> — по времени и проектам.</li>
<li><span data-icon="FolderOpen"></span><strong>Эффективность</strong> — по проектам и спринтам.</li>
<li><span data-icon="Download"></span><strong>Экспорт данных</strong> — выгрузка отчётов в файлы.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Управление")!.id,
      title: "Панель управления",
      content: `<p>Панель управления (маршрут <code>/management</code>) доступна только администраторам и позволяет настраивать все аспекты системы.</p>
<ul>
<li><span data-icon="Users"></span><strong>Пользователи и роли</strong> — управление доступами и правами.</li>
<li><span data-icon="Briefcase"></span><strong>Статусы и отделы</strong> — настройка рабочих процессов.</li>
<li><span data-icon="FolderOpen"></span><strong>Проекты и спринты</strong> — создание и архивирование.</li>
<li><span data-icon="Globe"></span><strong>Интеграции</strong> — Telegram, Яндекс Календарь.</li>
<li><span data-icon="BookOpen"></span><strong>База знаний</strong> — управление статьями и разделами.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
    {
      sectionId: sectionMap.get("Профиль")!.id,
      title: "Профиль пользователя",
      content: `<p>Профиль (маршрут <code>/profile</code>) позволяет редактировать личные данные, настройки уведомлений и пароль.</p>
<ul>
<li><span data-icon="User"></span><strong>Личные данные</strong> — ФИО, аватар, контакты.</li>
<li><span data-icon="Bell"></span><strong>Настройки уведомлений</strong> — email, Telegram, push.</li>
<li><span data-icon="Key"></span><strong>Смена пароля</strong> — обновление учётных данных.</li>
<li><span data-icon="Activity"></span><strong>Активность</strong> — статистика и история действий.</li>
</ul>`,
      sortOrder: 0,
      isVisible: true,
    },
  ];

  for (const a of articles) {
    await db.insert(schema.knowledgeArticles).values(a);
    console.log(`Created article: ${a.title}`);
  }

  console.log(`Knowledge base updated successfully: ${articles.length} articles.`);
}

updateKnowledgeBase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Update failed:", err);
    process.exit(1);
  });
