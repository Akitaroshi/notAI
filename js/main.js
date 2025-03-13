let btcChart, ethChart;

// Конфигурация графиков
function getChartConfig(color) {
    return {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: color,
                borderWidth: 2,
                pointBackgroundColor: color,
                pointRadius: 2,
                pointHoverRadius: 8,
                fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, `${color}33`);
                    gradient.addColorStop(1, `${color}05`);
                    return gradient;
                },
                tension: 0.35,
                borderJoinStyle: 'round'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `$${context.parsed.y.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}`
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    display: true,
                    position: 'right',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        padding: 8,
                        callback: (value) => `$${value.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        })}`
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    };
}

// Получение исторических данных
async function getHistoricalData(symbol) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=1h&limit=24`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Invalid data format received');
        }
        
        return data.map(candle => {
            const [timestamp, , , , closePrice] = candle;
            const randomFactor = 0.99 + Math.random() * 0.02;
            return [timestamp, parseFloat(closePrice) * randomFactor];
        });
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error);
        return Array(24).fill(0).map((_, i) => {
            const date = new Date();
            date.setHours(date.getHours() - i);
            const basePrice = symbol === 'BTC' ? 45000 : 2500;
            const randomFactor = 0.98 + Math.random() * 0.04;
            return [date.getTime(), (basePrice - (i * (basePrice * 0.002))) * randomFactor];
        }).reverse();
    }
}

// Инициализация графиков
async function initializeCharts() {
    try {
        const btcCtx = document.getElementById('btcChart').getContext('2d');
        const ethCtx = document.getElementById('ethChart').getContext('2d');

        btcChart = new Chart(btcCtx, getChartConfig('#2196f3'));
        ethChart = new Chart(ethCtx, getChartConfig('#00bcd4'));

        const [btcHistory, ethHistory] = await Promise.all([
            getHistoricalData('BTC'),
            getHistoricalData('ETH')
        ]);

        if (btcHistory.length > 0) {
            const btcData = processChartData(btcHistory);
            updateChartData(btcChart, btcData);
        }

        if (ethHistory.length > 0) {
            const ethData = processChartData(ethHistory);
            updateChartData(ethChart, ethData);
        }

        await updatePrices();
        setInterval(updatePrices, 300000);
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Обработка данных для графика
function processChartData(data) {
    const points = data.slice(-24);
    return {
        labels: points.map(item => new Date(item[0]).toLocaleTimeString()),
        prices: points.map(item => item[1])
    };
}

// Обновление данных графика
function updateChartData(chart, data) {
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.prices;
    chart.update();
}

// Обновление цен
async function updatePrices() {
    try {
        const [btcResponse, ethResponse] = await Promise.all([
            fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
            fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT')
        ]);

        if (!btcResponse.ok || !ethResponse.ok) throw new Error('Network response was not ok');
        
        const btcData = await btcResponse.json();
        const ethData = await ethResponse.json();

        animateValue('btc-price', parseFloat(btcData.lastPrice));
        animateValue('eth-price', parseFloat(ethData.lastPrice));

        const btcChangeEl = document.getElementById('btc-change');
        const ethChangeEl = document.getElementById('eth-change');

        const btcChange = parseFloat(btcData.priceChangePercent);
        const ethChange = parseFloat(ethData.priceChangePercent);

        updatePriceChange(btcChangeEl, btcChange);
        updatePriceChange(ethChangeEl, ethChange);

        if (btcChart && ethChart) {
            const currentTime = new Date().toLocaleTimeString();
            
            btcChart.data.labels.push(currentTime);
            btcChart.data.datasets[0].data.push(parseFloat(btcData.lastPrice));
            ethChart.data.labels.push(currentTime);
            ethChart.data.datasets[0].data.push(parseFloat(ethData.lastPrice));

            if (btcChart.data.labels.length > 24) {
                btcChart.data.labels.shift();
                btcChart.data.datasets[0].data.shift();
            }
            if (ethChart.data.labels.length > 24) {
                ethChart.data.labels.shift();
                ethChart.data.datasets[0].data.shift();
            }

            btcChart.update('none');
            ethChart.update('none');
        }
    } catch (error) {
        console.error('Error updating prices:', error);
        document.getElementById('btc-price').textContent = 'Ошибка загрузки';
        document.getElementById('eth-price').textContent = 'Ошибка загрузки';
    }
}

// Функция для анимации изменения цены
function animateValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const duration = 1000;
    const steps = 60;
    const increment = (newValue - currentValue) / steps;
    let step = 0;

    const animate = () => {
        step++;
        const value = currentValue + (increment * step);
        element.textContent = `$${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

        if (step < steps) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}

// Функция для обновления изменения цены
function updatePriceChange(element, change) {
    const formattedChange = change.toFixed(2);
    element.textContent = `Изменение за 24ч: ${change >= 0 ? '+' : ''}${formattedChange}%`;
    element.style.color = change >= 0 ? '#4caf50' : '#f44336';
}

// Функция для обновления балансов
function updateBalances() {
    let totalBtc = 0;
    let totalEth = 0;

    const walletBalances = {
        metamask: {
            btc: 0.05000000,
            eth: 1.20000000
        },
        tonkeeper: {
            btc: 0.03000000,
            eth: 0.80000000
        }
    };

    Object.values(walletBalances).forEach(wallet => {
        totalBtc += wallet.btc;
        totalEth += wallet.eth;
    });

    document.getElementById('btc-balance').textContent = `Баланс: ${totalBtc.toFixed(8)} BTC`;
    document.getElementById('eth-balance').textContent = `Баланс: ${totalEth.toFixed(8)} ETH`;
}

// Функция для показа уведомлений
function showNotification(title, message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-title">всплывашка</div>
            <div class="notification-message">${message}</div>
        </div>
        <div class="notification-close">×</div>
    `;

    const container = document.getElementById('notifications-container');
    container.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
        if (notification.classList.contains('show')) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Обработчик формы перевода
function handleTransferForm(e) {
    e.preventDefault();
    
    const sourceWallet = document.getElementById('source-wallet').value;
    const crypto = document.getElementById('crypto-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    const maxAmount = crypto === 'btc' ? 100 : 1000;
    
    if (amount > maxAmount) {
        showNotification(
            'Ошибка',
            `Максимальная сумма для перевода: ${maxAmount} ${crypto.toUpperCase()}`,
            'error'
        );
        return;
    }
    
    const walletBalances = {
        metamask: {
            btc: 0.05000000,
            eth: 1.20000000
        },
        tonkeeper: {
            btc: 0.03000000,
            eth: 0.80000000
        }
    };

    if (crypto === 'btc') {
        walletBalances[sourceWallet].btc += amount;
    } else {
        walletBalances[sourceWallet].eth += amount;
    }

    let totalBtc = 0;
    let totalEth = 0;

    Object.values(walletBalances).forEach(wallet => {
        totalBtc += wallet.btc;
        totalEth += wallet.eth;
    });

    document.getElementById('btc-balance').textContent = `Баланс: ${totalBtc.toFixed(8)} BTC`;
    document.getElementById('eth-balance').textContent = `Баланс: ${totalEth.toFixed(8)} ETH`;
    
    showNotification(
        'Успешно',
        `Перевод ${amount} ${crypto.toUpperCase()} с кошелька ${sourceWallet} выполнен!`
    );
    e.target.reset();
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    updateBalances();

    // Добавляем обработчики событий
    document.getElementById('transfer-form').addEventListener('submit', handleTransferForm);

    // Навигация между секциями
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });
});
