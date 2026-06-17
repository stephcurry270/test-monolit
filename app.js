const fs = require('fs').promises;
const readline = require('readline/promises');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    try {
        // 1. Загрузка данных
        const dataPath = path.join(__dirname, 'catalog.json');
        const catalog = JSON.parse(await fs.readFile(dataPath, 'utf-8'));

        // Список доступных регионов (вытаскиваем ключи из цен первого товара)
        const regions = Object.keys(catalog[0].prices);
        
        // 2. Выбор региона
        console.log('--- Выберите регион ---');
        regions.forEach((reg, idx) => console.log(`${idx + 1}. ${reg}`));
        const regionIdx = parseInt(await rl.question('Введите номер региона: ')) - 1;

        if (isNaN(regionIdx) || !regions[regionIdx]) {
            console.log('Некорректный ввод региона. Завершение работы.');
            return;
        }
        const selectedRegion = regions[regionIdx];

        // 3. Вывод товаров для региона
        console.log(`\n--- Доступные товары для региона: ${selectedRegion} ---`);
        catalog.forEach((item, idx) => {
            console.log(`${idx + 1}. [${item.category}] ${item.name} — ${item.prices[selectedRegion]} руб.`);
        });

        // 4. Выбор товара
        const itemIdx = parseInt(await rl.question('Выберите номер товара: ')) - 1;
        if (isNaN(itemIdx) || !catalog[itemIdx]) {
            console.log('Некорректный ввод товара. Завершение работы.');
            return;
        }
        let selectedItem = catalog[itemIdx];
        let finalPrice = selectedItem.prices[selectedRegion];
        let offerType = 'Обычная цена';

        // 5. Оформление заявки (Первая попытка)
        console.log(`\nВаш заказ: ${selectedItem.name} за ${finalPrice} руб. (${selectedRegion})`);
        const answer = (await rl.question('Оформляем заявку? (y/n): ')).trim().toLowerCase();

        if (answer === 'y') {
            await saveOrder(selectedItem, finalPrice, selectedRegion, offerType);
        } else if (answer === 'n') {
            // ЛОГИКА УДЕРЖАНИЯ КЛИЕНТА
            console.log('\nЖаль... Попробуем предложить вам более выгодные условия!');
            
            // Фильтруем товары той же категории
            const sameCategoryItems = catalog.filter(item => item.category === selectedItem.category);
            
            // Находим самый дешевый товар в этой категории для выбранного региона
            let cheapestItem = sameCategoryItems.reduce((min, item) => 
                item.prices[selectedRegion] < min.prices[selectedRegion] ? item : min
            , sameCategoryItems[0]);

            // Проверяем, является ли выбранный товар самым дешевым
            if (selectedItem.name === cheapestItem.name) {
                // Если он и так самый дешевый — делаем скидку 5%
                finalPrice = Math.round(finalPrice * 0.95);
                offerType = 'Скидка 5% (Удержание)';
                console.log(`Вы выбрали самый доступный товар в категории! Предлагаем его со скидкой 5%:`);
                console.log(`-> ${selectedItem.name} всего за ${finalPrice} руб.`);
            } else {
                // Если есть товар дешевле — предлагаем аналог
                selectedItem = cheapestItem;
                finalPrice = selectedItem.prices[selectedRegion];
                offerType = 'Более дешевый аналог (Удержание)';
                console.log(`Мы нашли для вас более бюджетный аналог в категории "${selectedItem.category}":`);
                console.log(`-> ${selectedItem.name} за ${finalPrice} руб.`);
            }

            // Повторный вопрос
            const finalAnswer = (await rl.question('\nПринимаете новое предложение? (y/n): ')).trim().toLowerCase();
            if (finalAnswer === 'y') {
                await saveOrder(selectedItem, finalPrice, selectedRegion, offerType);
            } else {
                console.log('Заявка отменена. Будем рады видеть вас снова!');
            }
        } else {
            console.log('Некорректный ввод. Заявка аннулирована.');
        }

    } catch (error) {
        console.error('Произошла ошибка:', error.message);
    } finally {
        rl.close();
    }
}

// Функция для генерации JSON-файла заявки
async function saveOrder(item, price, region, offerType) {
    const order = {
        timestamp: new Date().toISOString(),
        region: region,
        product: item.name,
        category: item.category,
        finalPrice: price,
        status: "Confirmed",
        offerDetails: offerType
    };

    const fileName = `order_${Date.now()}.json`;
    await fs.writeFile(fileName, JSON.stringify(order, null, 2), 'utf-8');
    console.log(`\n🎉 Заявка успешно оформлена и сохранена в файл: ${fileName}`);
}

main();