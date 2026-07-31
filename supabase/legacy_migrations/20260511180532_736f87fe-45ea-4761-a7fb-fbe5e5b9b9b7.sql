
CREATE TABLE public.product_glossary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  base_product_type text,
  is_calculable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_glossary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read product_glossary"
ON public.product_glossary FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write product_glossary"
ON public.product_glossary FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_product_glossary_updated
BEFORE UPDATE ON public.product_glossary
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.product_glossary (slug, name, description, category, base_product_type, is_calculable, sort_order) VALUES
-- print_small
('leaflet','Листовка','Одностороннее или двухстороннее рекламное изделие небольшого формата для раздачи и рекламы.','print_small','leaflet',true,10),
('flyer','Флаер','Рекламная листовка, чаще всего используемая для акций, скидок и мероприятий.','print_small','leaflet',true,20),
('eurofly','Еврофлаер','Узкая рекламная листовка формата 99×210 мм.','print_small','leaflet',true,30),
('businesscard','Визитка','Компактная карточка с контактной информацией компании или человека.','print_small','businesscard',true,40),
('poster_ad','Афиша','Рекламное объявление о мероприятии.','print_small','leaflet',true,50),
('insert','Вкладыш','Дополнительный информационный лист внутри упаковки.','print_small','leaflet',true,60),
('coupon','Купон','Печатный талон на скидку или участие в акции.','print_small','leaflet',true,70),
('survey','Анкета','Печатная форма для заполнения данных.','print_small','leaflet',true,80),
('menu','Меню','Перечень блюд или услуг для ресторанов и кафе.','print_small','leaflet',true,90),
('postcard','Открытка','Поздравительное или рекламное печатное изделие.','print_small','envelope',true,100),
('invitation','Приглашение','Печатное изделие для приглашения на мероприятие.','print_small','envelope',true,110),

-- multipage
('booklet','Буклет','Печатное изделие с одним или несколькими сгибами для размещения информации.','multipage','booklet',true,200),
('triplet','Триплет','Буклет с двумя фальцами, разделённый на три части.','multipage','booklet',true,210),
('leaflet_fold','Лифлет','Рекламное изделие с несколькими сгибами без скрепления.','multipage','booklet',true,220),
('brochure','Брошюра','Многостраничное изделие на скобе или клею.','multipage','brochure',true,230),
('catalog','Каталог','Многостраничное изделие для демонстрации товаров или услуг.','multipage','brochure',true,240),
('magazine','Журнал','Периодическое многостраничное издание.','multipage','magazine',true,250),
('book','Книга','Переплетённое многостраничное издание большого объёма.','multipage','book',true,260),
('notepad','Блокнот','Изделие с листами для записей, скреплёнными между собой.','multipage','notepad',true,270),
('diary','Ежедневник','Блокнот для планирования задач и записей по дням.','multipage','notepad',true,280),
('notebook','Тетрадь','Изделие из нескольких листов для записей или обучения.','multipage','notepad',true,290),
('manual','Инструкция','Печатное руководство по использованию товара.','multipage','brochure',true,300),
('checkbook','Чековая книжка','Комплект бланков или квитанций.','multipage','brochure',true,310),

-- calendar
('calendar_wall','Календарь настенный','Календарь для размещения на стене.','calendar','calendar_wall',true,400),
('calendar_quarter','Календарь квартальный','Календарь с отображением нескольких месяцев одновременно.','calendar','calendar_quarter',true,410),
('calendar_desk','Календарь настольный','Календарь для установки на столе.','calendar','calendar_desk',true,420),
('calendar_pocket','Карманный календарь','Небольшой календарь карманного формата.','calendar','businesscard',true,430),

-- large_format
('poster','Плакат','Крупноформатное информационное или рекламное изображение.','large_format','poster',true,500),
('poster_decor','Постер','Декоративное или рекламное изображение для интерьера или рекламы.','large_format','poster',true,510),
('banner','Баннер','Широкоформатное рекламное полотно.','large_format',NULL,false,520),
('rollup','Роллап','Мобильный стенд с баннером.','large_format',NULL,false,530),
('presswall','Пресс-волл','Большая брендированная конструкция для мероприятий.','large_format',NULL,false,540),
('photozone','Фотозона','Оформленная зона для фотографирования.','large_format',NULL,false,550),
('canvas','Холст','Печатное изображение на холстовом материале.','large_format',NULL,false,560),

-- sticker / label
('sticker_decal','Наклейка','Самоклеящееся изделие для маркировки или рекламы.','sticker','sticker',true,600),
('sticker','Стикер','Небольшая наклейка декоративного или рекламного назначения.','sticker','sticker',true,610),
('label','Этикетка','Маркировочное изделие для упаковки товара.','sticker','label',true,620),
('tag','Бирка','Информационный элемент для товара или одежды.','sticker','businesscard',true,630),
('tag_clothing','Бирка на одежду','Информационная бирка для текстильной продукции.','sticker','businesscard',true,640),
('magnet','Магнит','Сувенирная продукция с магнитной основой.','sticker','sticker',true,650),
('car_sticker','Наклейка на авто','Самоклеящаяся графика для автомобиля.','sticker','sticker',true,660),

-- pos
('wobbler','Воблер','Подвесной рекламный POS-элемент для привлечения внимания.','pos','wobbler',true,700),
('shelftalker','Шелфтокер','Рекламный элемент, крепящийся к полке магазина.','pos','shelftalker',true,710),
('hanger','Хенгер','Рекламный или информационный элемент, подвешиваемый на товар.','pos','wobbler',true,720),
('tabletent','Тейблтент','Настольный рекламный носитель.','pos','shelftalker',true,730),
('mobile','Мобайл','Подвесная рекламная конструкция.','pos','wobbler',true,740),
('menuholder','Менюхолдер','Подставка для меню или рекламы.','pos','shelftalker',true,750),
('pricetag','Ценник','Информационный носитель с ценой товара.','pos','businesscard',true,760),
('badge','Бейдж','Персональная карточка сотрудника или участника.','pos','businesscard',true,770),
('display','Дисплей','Рекламная конструкция для демонстрации продукции.','pos',NULL,false,780),
('character','Ростовая фигура','Крупная рекламная конструкция в виде персонажа или объекта.','pos',NULL,false,790),
('pos_material','POS-материал','Рекламная продукция для мест продаж.','pos',NULL,false,800),
('signage','Табличка','Информационная или навигационная панель.','pos',NULL,false,810),

-- document
('envelope','Конверт','Упаковка для писем, документов или открыток.','document','envelope',true,900),
('folder','Папка','Изделие для хранения документов.','document','folder',true,910),
('cert_folder','Сертификатная папка','Папка для вручения документов или сертификатов.','document','folder',true,920),
('certificate','Сертификат','Именной документ подтверждающего характера.','document','folder',true,930),
('diploma','Диплом','Наградной или образовательный документ.','document','folder',true,940),
('honorary','Грамота','Наградной печатный документ.','document','folder',true,950),
('blank','Бланк','Фирменный лист для документов или заявлений.','document','blank',true,960),
('selfcopy','Самокопирующийся бланк','Многослойный бланк для автоматического копирования информации.','document','selfcopy',true,970),

-- packaging_bag
('bag_paper','Пакет бумажный','Пакет из бумаги для упаковки товаров.','packaging_bag','bag',true,1000),
('bag_kraft','Пакет крафтовый','Пакет из крафт-бумаги повышенной плотности.','packaging_bag','bag',true,1010),
('bag_laminated','Пакет ламинированный','Бумажный пакет с ламинацией.','packaging_bag','bag',true,1020),

-- packaging_box
('box','Коробка','Упаковочное изделие из картона или других материалов.','packaging_box','box',true,1100),
('box_selfassembly','Самосборная коробка','Коробка, собираемая без клея.','packaging_box','box',true,1110),
('box_window','Коробка с окном','Коробка с прозрачной вставкой для демонстрации товара.','packaging_box','box',true,1120),
('box_lidbottom','Коробка крышка-дно','Коробка из двух отдельных частей.','packaging_box','box',true,1130),
('box_pencil','Пенал','Упаковка вытяжного типа с выдвижной частью.','packaging_box','box',true,1140),
('showbox','Шоу-бокс','Упаковка-витрина для размещения товара на полке.','packaging_box','box',true,1150),
('tube','Тубус','Цилиндрическая упаковка для подарков, документов или продукции.','packaging_box','box',true,1160),
('kubus','Кубус','Коробка кубической формы.','packaging_box','kubus',true,1170),
('box_magnetic','Коробка с магнитным клапаном','Премиальная коробка с магнитной фиксацией.','packaging_box','box',true,1180),
('box_ribbons','Коробка на лентах','Подарочная коробка с ленточным закрытием.','packaging_box','box',true,1190),
('box_briefcase','Коробка-портфель','Коробка с ручкой для переноски.','packaging_box','box',true,1200),
('box_transformer','Коробка-трансформер','Коробка со сложной раскладной конструкцией.','packaging_box','box',true,1210),
('box_clearwindow','Коробка с прозрачным окном','Коробка с обзорной вставкой.','packaging_box','box',true,1220),
('box_petlid','Коробка с ПЭТ-крышкой','Коробка с прозрачной пластиковой крышкой.','packaging_box','box',true,1230),
('box_round','Круглая коробка','Коробка цилиндрической формы.','packaging_box','box',true,1240),
('box_oval','Овальная коробка','Коробка овальной формы.','packaging_box','box',true,1250),
('box_shaped','Фигурная коробка','Коробка нестандартной формы.','packaging_box','box',true,1260),
('packaging','Упаковка','Изделие для хранения, транспортировки и презентации товара.','packaging_box','box',true,1270),
('pack_chocolate','Упаковка для шоколада','Коробка или обёртка для шоколадной продукции.','packaging_box','box',true,1280),
('pack_candles','Упаковка для свечей','Упаковка для свечной продукции.','packaging_box','box',true,1290),
('pack_cosmetics','Упаковка для косметики','Упаковка для косметических товаров.','packaging_box','box',true,1300),
('pack_food','Упаковка для еды','Упаковка для пищевой продукции.','packaging_box','box',true,1310),
('pack_cheese','Упаковка для сыра','Специализированная упаковка для сырной продукции.','packaging_box','box',true,1320),
('pack_gift','Упаковка для подарков','Декоративная подарочная упаковка.','packaging_box','box',true,1330),
('box_shoes','Коробка для обуви','Упаковка для обувной продукции.','packaging_box','box',true,1340),
('box_clothes','Коробка для одежды','Упаковка для текстильной продукции.','packaging_box','box',true,1350),
('box_cake','Коробка для торта','Упаковка для кондитерских изделий.','packaging_box','box',true,1360),
('box_flowers','Коробка для цветов','Декоративная упаковка для цветочных композиций.','packaging_box','box',true,1370),
('box_phone','Коробка для телефона','Упаковка для электроники и аксессуаров.','packaging_box','box',true,1380),
('box_souvenirs','Коробка для сувениров','Упаковка для подарочной и сувенирной продукции.','packaging_box','box',true,1390),
('box_marketplace','Коробка для маркетплейсов','Транспортировочная упаковка для интернет-заказов.','packaging_box','box',true,1400),
('sleeve','Обечайка','Бумажная или картонная лента вокруг упаковки.','packaging_box','box',true,1410),
('shuber','Шубер','Внешняя обложка или чехол для упаковки.','packaging_box','box',true,1420),
('slipcase','Слипкейс','Защитный футляр для книг или комплектов.','packaging_box','box',true,1430),

-- souvenir
('beermat','Бирдекель','Подставка под кружку или стакан.','souvenir','businesscard',true,1500),
('puzzle','Пазл','Изделие из частей, собираемых в изображение.','souvenir','poster',true,1510);
