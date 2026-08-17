// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loaderText');
const dashboard = document.getElementById('dashboard');
const uploadSection = document.getElementById('uploadSection');

// Header Elements
const pageTitle = document.getElementById('pageTitle');
const themeToggle = document.getElementById('themeToggle');
const printBtn = document.getElementById('printBtn');
const removePdf = document.getElementById('removePdf');

// Sidebar Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPages = document.querySelectorAll('.tab-page');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const appLayout = document.querySelector('.app-layout');
const sidebar = document.querySelector('.sidebar');
const mobileBottomNav = document.getElementById('mobileBottomNav');
const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

// Metrics Elements
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const netSavingsEl = document.getElementById('netSavings');
const incomeCountEl = document.getElementById('incomeCount');
const expenseCountEl = document.getElementById('expenseCount');
const savingsRateEl = document.getElementById('savingsRate');

// Table Elements
const transactionsBody = document.getElementById('transactionsBody');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const topCategoriesBody = document.getElementById('topCategoriesBody');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const batchDeleteBtn = document.getElementById('batchDeleteBtn');
const batchExportBtn = document.getElementById('batchExportBtn');
const exportAllBtn = document.getElementById('exportAllBtn');
const exportFilteredBtn = document.getElementById('exportFilteredBtn');
const pipelineSteps = document.querySelectorAll('.pipeline-step');

// Directory & Pipeline Elements
const topSendersBody = document.getElementById('topSendersBody');
const topRecipientsBody = document.getElementById('topRecipientsBody');
const pipeInflow = document.getElementById('pipeInflow');
const pipeLedger = document.getElementById('pipeLedger');
const pipeOutflow = document.getElementById('pipeOutflow');
const pipeSavings = document.getElementById('pipeSavings');

// Modal Elements
const detailsModal = document.getElementById('detailsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const detailDate = document.getElementById('detailDate');
const detailNarration = document.getElementById('detailNarration');
const detailCategory = document.getElementById('detailCategory');
const detailRef = document.getElementById('detailRef');
const detailType = document.getElementById('detailType');
const detailAmount = document.getElementById('detailAmount');
const detailBalance = document.getElementById('detailBalance');

let allTransactions = [];
let categoryChart = null;

// Tab Navigation Logic
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        
        // Update active class in sidebar
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Sync active class on bottom nav
        mobileNavItems.forEach(m => {
            if (m.getAttribute('data-tab') === tab) {
                m.classList.add('active');
            } else {
                m.classList.remove('active');
            }
        });
        
        // Show correct page
        tabPages.forEach(page => {
            if (page.id === `tab-${tab}`) {
                page.style.display = 'block';
            } else {
                page.style.display = 'none';
            }
        });
        
        // Update Header Title
        pageTitle.textContent = item.textContent.trim();
        
        // Mobile auto close drawer
        if (window.innerWidth <= 768) {
            closeSidebarDrawer();
        }
    });
});

// Sync Mobile Bottom Nav Clicks
mobileNavItems.forEach(mbItem => {
    mbItem.addEventListener('click', () => {
        const tab = mbItem.getAttribute('data-tab');
        
        // Sync active class on bottom nav items
        mobileNavItems.forEach(m => m.classList.remove('active'));
        mbItem.classList.add('active');
        
        // Trigger click on corresponding desktop nav item
        const matchingSidebarItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
        if (matchingSidebarItem) {
            matchingSidebarItem.click();
        }
    });
});

// Sidebar Toggle Actions
sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('sidebar-open');
        sidebarOverlay.classList.toggle('active');
    } else {
        appLayout.classList.toggle('sidebar-collapsed');
    }
});

sidebarClose.addEventListener('click', closeSidebarDrawer);
sidebarOverlay.addEventListener('click', closeSidebarDrawer);

function closeSidebarDrawer() {
    sidebar.classList.remove('sidebar-open');
    sidebarOverlay.classList.remove('active');
}

// Drag & Drop listeners
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext !== 'pdf' && ext !== 'csv') {
        alert('Please upload a valid PDF or CSV bank statement.');
        return;
    }
    
    uploadSection.style.display = 'none';
    loader.style.display = 'flex';
    dashboard.style.display = 'none';
    
    if (ext === 'pdf') {
        parseStatement(file);
    } else {
        parseCSVStatement(file);
    }
}

async function parseCSVStatement(file) {
    try {
        loaderText.textContent = "Loading CSV file...";
        const text = await file.text();
        
        loaderText.textContent = "Processing transactions...";
        const lines = text.split(/\r?\n/);
        
        let transactions = [];
        let parsingStarted = false;
        let transactionIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = parseCSVLine(line);
            
            if (!parsingStarted) {
                if (cols.includes('Sl. No.') && cols.includes('Transaction Date') && cols.includes('Description')) {
                    parsingStarted = true;
                }
                continue;
            }
            
            if (cols.includes('Closing Balance') || cols.includes('Important Note:') || cols[0].includes('Closing Balance')) {
                break;
            }
            
            if (cols.length >= 8 && /^\d+$/.test(cols[0])) {
                const dateStr = cols[1].split(' ')[0];
                const narration = cols[3];
                const ref = cols[4];
                const amt = parseFloat(cols[5].replace(/,/g, ''));
                const type = cols[6].toUpperCase();
                const balance = parseFloat(cols[7].replace(/,/g, ''));
                
                let w = 0.0;
                let d = 0.0;
                if (type === 'DR') {
                    w = amt;
                } else if (type === 'CR') {
                    d = amt;
                }
                
                transactions.push({
                    id: transactionIndex++,
                    date: dateStr,
                    narration: narration,
                    withdrawal: w,
                    deposit: d,
                    balance: balance,
                    amount: amt,
                    amtPos: ref,
                    category: categorizeTransaction(narration)
                });
            }
        }
        
        allTransactions = transactions;
        renderDashboard();
        
    } catch (error) {
        console.error(error);
        alert("Error reading CSV. Make sure it is a valid Kotak bank statement.");
        loader.style.display = 'none';
        uploadSection.style.display = 'block';
    }
}

function parseCSVLine(line) {
    let result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function parseStatement(file) {
    try {
        loaderText.textContent = "Loading PDF file...";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        let allPageLines = [];
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            loaderText.textContent = `Parsing page ${pageNum} of ${totalPages}...`;
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Group text items by Y coordinate with a tolerance of 3 units
            const linesMap = new Map();
            const tolerance = 3;
            
            for (const item of textContent.items) {
                if (!item.str.trim()) continue;
                const x = item.transform[4];
                const y = item.transform[5];
                
                let foundKey = null;
                for (const key of linesMap.keys()) {
                    if (Math.abs(key - y) < tolerance) {
                        foundKey = key;
                        break;
                    }
                }
                
                if (foundKey === null) {
                    foundKey = y;
                    linesMap.set(y, []);
                }
                linesMap.get(foundKey).push({ text: item.str, x: x });
            }
            
            // Sort Y descending (top to bottom)
            const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
            
            for (const y of sortedY) {
                const lineItems = linesMap.get(y);
                lineItems.sort((a, b) => a.x - b.x);
                
                // Reconstruct line string estimating spaces by X coordinates
                let lineStr = "";
                let currentX = 0;
                for (const item of lineItems) {
                    const spaces = Math.max(1, Math.round((item.x - currentX) / 6));
                    if (currentX === 0) {
                        lineStr += " ".repeat(Math.round(item.x / 6)) + item.text;
                    } else {
                        lineStr += " ".repeat(spaces) + item.text;
                    }
                    currentX = item.x + item.text.length * 6;
                }
                allPageLines.push(lineStr);
            }
        }
        
        loaderText.textContent = "Processing transactions...";
        processLines(allPageLines);
        
    } catch (error) {
        console.error(error);
        alert("Error reading PDF. Make sure it's not password-protected and is a valid HDFC statement.");
        loader.style.display = 'none';
        uploadSection.style.display = 'block';
    }
}

function isHeaderFooterLine(line) {
    const text = line.toUpperCase();
    return text.includes('STATEMENT OF ACCOUNT') ||
           text.includes('CONTENTS OF THIS STATEMENT') ||
           text.includes('REGISTERED OFFICE ADDRESS') ||
           text.includes('HDFC BANK') ||
           text.includes('PAGE NO') ||
           text.includes('OPPOSITE SURI') ||
           text.includes('OP LIMIT') ||
           text.includes('CUST ID') ||
           text.includes('CUSTID') ||
           text.includes('OPLIMIT') ||
           text.includes('ACCOUNT NO') ||
           text.includes('RTGS/NEFT') ||
           text.includes('JOINT HOLDERS') ||
           text.includes('BRANCH CODE') ||
           text.includes('STATEMENT FROM') ||
           text.includes('SAVINGS A/C') ||
           text.includes('ACCOUNT BRANCH') ||
           text.includes('CLOSING BALANCE') ||
           text.includes('MADHUBANI') ||
           text.includes('BIHAR') ||
           text.includes('RAHULKUMARRAM') ||
           text.includes('MEHANDRARAM') ||
           text.includes('KHAJURI') ||
           text.includes('PHONE NO') ||
           text.includes('EMAIL') ||
           text.includes('OPP.SURI HIGH SCHOOL') ||
           text.includes('S/O') ||
           text.includes('CURRENCY') ||
           text.includes('A/COPENDate') ||
           text.includes('A/C OPEN DATE') ||
           text.includes('ACCOUNT STATUS') ||
           text.includes('NOMINATION') ||
           text.includes('JOINTHOLDERS') ||
           text.includes('RTGS/NEFT') ||
           text.includes('IFSC') ||
           text.includes('SARASWATI') ||
           text.includes('VIDYA') ||
           text.includes('MICR');
}

function processLines(lines) {
    let transactions = [];
    let currentTransaction = null;
    let transactionIndex = 0;
    
    const dateRegex = /^\s*(\d{2}\/\d{2}\/\d{2})\s+(.*)$/;
    const valDtRegex = /\s+(\d{2}\/\d{2}\/\d{2})\s+([\d,.\s]+)$/;
    
    for (const line of lines) {
        const lineStripped = line.trim();
        if (!lineStripped) continue;
        
        const match = line.match(dateRegex);
        if (match) {
            const date = match[1];
            const rest = match[2];
            
            const valDtMatch = rest.match(valDtRegex);
            if (valDtMatch) {
                const narrationChq = rest.substring(0, valDtMatch.index).trim();
                const valDt = valDtMatch[1];
                const amountsStr = valDtMatch[2].trim();
                const amounts = amountsStr.split(/\s+/);
                
                if (amounts.length >= 2) {
                    const balance = parseFloat(amounts[amounts.length - 1].replace(/,/g, ''));
                    const amt = parseFloat(amounts[amounts.length - 2].replace(/,/g, ''));
                    const amtPos = line.lastIndexOf(amounts[amounts.length - 2]);
                    
                    if (currentTransaction) {
                        transactions.push(currentTransaction);
                    }
                    
                    currentTransaction = {
                        id: transactionIndex++,
                        date: date,
                        narration: narrationChq,
                        withdrawal: 0.0,
                        deposit: 0.0,
                        balance: balance,
                        amount: amt,
                        amtPos: amtPos
                    };
                }
            }
        } else if (currentTransaction) {
            // Continuation of Narration
            if (!/[\d,]+\.\d{2}$/.test(lineStripped)) {
                if (!isHeaderFooterLine(line)) {
                    currentTransaction.narration += " " + lineStripped;
                }
            }
        }
    }
    
    if (currentTransaction) {
        transactions.push(currentTransaction);
    }
    
    // Determine withdrawal vs deposit using previous balance
    let prevBalance = null;
    for (const t of transactions) {
        if (prevBalance !== null) {
            const diff = t.balance - prevBalance;
            if (diff > 0.01) {
                t.deposit = t.amount;
            } else if (diff < -0.01) {
                t.withdrawal = t.amount;
            } else {
                if (t.amtPos > 74) {
                    t.deposit = t.amount;
                } else {
                    t.withdrawal = t.amount;
                }
            }
        } else {
            if (t.amtPos > 74) {
                t.deposit = t.amount;
            } else {
                t.withdrawal = t.amount;
            }
        }
        prevBalance = t.balance;
        t.category = categorizeTransaction(t.narration);
    }
    
    allTransactions = transactions;
    renderDashboard();
}

function categorizeTransaction(narration) {
    const text = narration.toUpperCase();
    // Added specific check for Shiv Shakti / HP Gas
    if (text.includes('SHIV SHAKTI') || text.includes('SHIVSHAKTI') || text.includes('HPGAS') || text.includes('GASAGENCY')) {
        return 'Shiv Shakti (HP Gas)';
    }
    if (text.includes('UPI')) return 'UPI Transfer';
    if (text.includes('ATM') || text.includes('CASH')) return 'Cash Withdrawal';
    if (text.includes('NEFT') || text.includes('RTGS') || text.includes('IMPS')) return 'Bank Transfer';
    if (text.includes('POS') || text.includes('PURCHASE')) return 'Card Swipe';
    if (text.includes('CHRG') || text.includes('FEE') || text.includes('GST')) return 'Bank Charges';
    if (text.includes('INT') && text.includes('PD')) return 'Interest Received';
    if (text.includes('ZOMATO') || text.includes('SWIGGY')) return 'Food & Dining';
    if (text.includes('AMAZON') || text.includes('FLIPKART')) return 'Shopping';
    return 'Other';
}

function cleanName(narration) {
    let name = narration.trim();
    if (name.startsWith('UPI-')) {
        name = name.substring(4);
    }
    name = name.split('@')[0];
    name = name.split('-')[0].trim();
    // Strip reference numbers
    name = name.replace(/\d{12,16}/g, '').trim();
    return name || 'Unknown';
}

function renderDashboard() {
    loader.style.display = 'none';
    dashboard.style.display = 'block';
    printBtn.style.display = 'inline-flex';
    removePdf.style.display = 'inline-flex';
    exportAllBtn.style.display = 'inline-flex';
    exportFilteredBtn.style.display = 'inline-flex';
    mobileBottomNav.classList.add('visible');
    
    // Reset Checkboxes state
    selectAllCheckbox.checked = false;
    updateBatchButtons();
    
    // Metrics calculations
    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    
    allTransactions.forEach(t => {
        totalIncome += t.deposit;
        totalExpenses += t.withdrawal;
        if (t.deposit > 0) incomeCount++;
        if (t.withdrawal > 0) expenseCount++;
    });
    
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    
    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpensesEl.textContent = formatCurrency(totalExpenses);
    netSavingsEl.textContent = formatCurrency(netSavings);
    
    // Style Net Savings card
    if (netSavings >= 0) {
        netSavingsEl.className = 'metric-value income-value';
    } else {
        netSavingsEl.className = 'metric-value expense-value';
    }
    
    incomeCountEl.textContent = `${incomeCount} deposits`;
    expenseCountEl.textContent = `${expenseCount} withdrawals`;
    savingsRateEl.textContent = `${savingsRate}% savings rate`;
    
    // Populate categories filter dropdown
    const categories = [...new Set(allTransactions.map(t => t.category))];
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(c => {
        categoryFilter.innerHTML += `<option value="${c}">${c}</option>`;
    });
    
    // Render Category Summary Table & Chart Data
    const categoryExpenses = {};
    allTransactions.forEach(t => {
        if (t.withdrawal > 0) {
            categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.withdrawal;
        }
    });
    
    const sortedCategories = Object.keys(categoryExpenses).map(cat => ({
        name: cat,
        amount: categoryExpenses[cat],
        pct: totalExpenses > 0 ? ((categoryExpenses[cat] / totalExpenses) * 100).toFixed(1) : 0
    })).sort((a, b) => b.amount - a.amount);
    
    topCategoriesBody.innerHTML = '';
    sortedCategories.forEach(item => {
        topCategoriesBody.innerHTML += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td class="text-right num-val w-val">${formatCurrency(item.amount)}</td>
                <td class="text-right num-val">${item.pct}%</td>
            </tr>
        `;
    });
    
    // Render Chart
    renderChart(sortedCategories);
    
    // Calculate Senders and Recipients
    const senders = {};
    const recipients = {};
    
    allTransactions.forEach(t => {
        const name = cleanName(t.narration);
        if (t.deposit > 0) {
            if (!senders[name]) senders[name] = { amount: 0, count: 0 };
            senders[name].amount += t.deposit;
            senders[name].count += 1;
        }
        if (t.withdrawal > 0) {
            if (!recipients[name]) recipients[name] = { amount: 0, count: 0 };
            recipients[name].amount += t.withdrawal;
            recipients[name].count += 1;
        }
    });
    
    const sortedSenders = Object.keys(senders).map(name => ({
        name: name,
        amount: senders[name].amount,
        count: senders[name].count
    })).sort((a, b) => b.amount - a.amount).slice(0, 5);
    
    const sortedRecipients = Object.keys(recipients).map(name => ({
        name: name,
        amount: recipients[name].amount,
        count: recipients[name].count
    })).sort((a, b) => b.amount - a.amount).slice(0, 5);
    
    // Render Senders
    topSendersBody.innerHTML = '';
    sortedSenders.forEach(item => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.title = `Click to filter transactions for ${item.name}`;
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td class="text-right num-val d-val">${formatCurrency(item.amount)}</td>
            <td class="text-right num-val" style="color: var(--color-ink-mute); font-size: 12px;">${item.count} txns</td>
        `;
        row.addEventListener('click', () => {
            // Switch to Ledger page first
            document.querySelector('[data-tab="ledger"]').click();
            searchInput.value = item.name;
            filterAndRenderTable();
        });
        topSendersBody.appendChild(row);
    });
    
    // Render Recipients
    topRecipientsBody.innerHTML = '';
    sortedRecipients.forEach(item => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.title = `Click to filter transactions for ${item.name}`;
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td class="text-right num-val w-val">${formatCurrency(item.amount)}</td>
            <td class="text-right num-val" style="color: var(--color-ink-mute); font-size: 12px;">${item.count} txns</td>
        `;
        row.addEventListener('click', () => {
            document.querySelector('[data-tab="ledger"]').click();
            searchInput.value = item.name;
            filterAndRenderTable();
        });
        topRecipientsBody.appendChild(row);
    });
    
    // Render Savings Pipeline values
    pipeInflow.textContent = formatCurrency(totalIncome);
    pipeLedger.textContent = formatCurrency(totalIncome);
    pipeOutflow.textContent = formatCurrency(totalExpenses);
    pipeSavings.textContent = formatCurrency(netSavings);
    
    // Render Main Transactions Table
    filterAndRenderTable();
}

function renderChart(data) {
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const isDark = document.body.classList.contains('dark');
    const options = {
        series: data.map(d => d.amount),
        chart: {
            type: 'donut',
            height: 350,
            fontFamily: 'Plus Jakarta Sans, sans-serif'
        },
        theme: {
            mode: isDark ? 'dark' : 'light'
        },
        labels: data.map(d => d.name),
        colors: ['#533afd', '#ea2261', '#0ebb7a', '#c026d3', '#0284c7', '#ea580c', '#9333ea', '#475569'],
        legend: {
            position: 'bottom'
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return formatCurrency(val);
                }
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total Expenses',
                            formatter: function (w) {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return formatCurrency(total);
                            }
                        }
                    }
                }
            }
        }
    };

    categoryChart = new ApexCharts(document.querySelector("#categoryChart"), options);
    categoryChart.render();
}

function filterAndRenderTable() {
    const query = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;
    
    const filtered = allTransactions.filter(t => {
        const matchesQuery = t.narration.toLowerCase().includes(query);
        const matchesCat = cat === 'all' || t.category === cat;
        return matchesQuery && matchesCat;
    });
    
    transactionsBody.innerHTML = '';
    filtered.forEach(t => {
        const badgeClass = `badge badge-${t.category.toLowerCase().replace(/[\s()]+/g, '-')}`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="txn-checkbox" data-id="${t.id}"></td>
            <td data-label="Date" style="white-space: nowrap;">${t.date}</td>
            <td data-label="Narration">${t.narration}</td>
            <td data-label="Category"><span class="${badgeClass}">${t.category}</span></td>
            <td data-label="Withdrawal" class="text-right num-val w-val">${t.withdrawal > 0 ? formatCurrency(t.withdrawal) : '-'}</td>
            <td data-label="Deposit" class="text-right num-val d-val">${t.deposit > 0 ? formatCurrency(t.deposit) : '-'}</td>
            <td data-label="Balance" class="text-right num-val" style="font-weight: 500;">${formatCurrency(t.balance)}</td>
            <td class="text-center">
                <button class="btn-view" data-id="${t.id}" style="display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                    <span>View</span>
                </button>
            </td>
        `;
        
        // Listeners for checkbox and View details button
        row.querySelector('.txn-checkbox').addEventListener('change', updateBatchButtons);
        row.querySelector('.btn-view').addEventListener('click', () => openModal(t));
        
        transactionsBody.appendChild(row);
    });
    
    // Re-initialize dynamic icons
    if (window.lucide) {
        lucide.createIcons();
    }
}

function openModal(t) {
    detailDate.textContent = t.date;
    detailNarration.textContent = t.narration;
    detailCategory.textContent = t.category;
    detailRef.textContent = t.amtPos || 'N/A'; // fallback if no specific ref parsed
    detailType.textContent = t.withdrawal > 0 ? 'Debit (Withdrawal)' : 'Credit (Deposit)';
    detailAmount.textContent = t.withdrawal > 0 ? formatCurrency(t.withdrawal) : formatCurrency(t.deposit);
    detailAmount.className = t.withdrawal > 0 ? 'detail-val text-bold expense-value' : 'detail-val text-bold income-value';
    detailBalance.textContent = formatCurrency(t.balance);
    
    detailsModal.style.display = 'flex';
}

closeModalBtn.addEventListener('click', () => {
    detailsModal.style.display = 'none';
});

// Close modal if clicking outside
detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
});

function updateBatchButtons() {
    const checkedBoxes = document.querySelectorAll('.txn-checkbox:checked');
    if (checkedBoxes.length > 0) {
        batchDeleteBtn.style.display = 'inline-flex';
        batchExportBtn.style.display = 'inline-flex';
        batchDeleteBtn.textContent = `Delete Selected (${checkedBoxes.length})`;
        batchExportBtn.textContent = `Export Selected (${checkedBoxes.length}) CSV`;
    } else {
        batchDeleteBtn.style.display = 'none';
        batchExportBtn.style.display = 'none';
    }
}

// Select All
selectAllCheckbox.addEventListener('change', (e) => {
    const checked = e.target.checked;
    const checkboxes = document.querySelectorAll('.txn-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
    });
    updateBatchButtons();
});

// Batch Delete Logic
batchDeleteBtn.addEventListener('click', () => {
    const checkedBoxes = document.querySelectorAll('.txn-checkbox:checked');
    const idsToDelete = Array.from(checkedBoxes).map(cb => parseInt(cb.getAttribute('data-id')));
    
    if (confirm(`Are you sure you want to remove ${idsToDelete.length} transactions from the active view?`)) {
        allTransactions = allTransactions.filter(t => !idsToDelete.includes(t.id));
        renderDashboard();
    }
});

// Batch Export CSV logic
batchExportBtn.addEventListener('click', () => {
    const checkedBoxes = document.querySelectorAll('.txn-checkbox:checked');
    const idsToExport = Array.from(checkedBoxes).map(cb => parseInt(cb.getAttribute('data-id')));
    
    const exportData = allTransactions.filter(t => idsToExport.includes(t.id));
    
    let csvContent = "data:text/csv;charset=utf-8,Date,Narration,Category,Withdrawal,Deposit,Balance\n";
    exportData.forEach(t => {
        const row = `"${t.date}","${t.narration.replace(/"/g, '""')}","${t.category}",${t.withdrawal},${t.deposit},${t.balance}\n`;
        csvContent += row;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hdfc_selected_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Search and filters
searchInput.addEventListener('input', filterAndRenderTable);
categoryFilter.addEventListener('change', filterAndRenderTable);

// Print Logic
printBtn.addEventListener('click', () => {
    window.print();
});

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Theme Toggle Logic
const sunIcon = themeToggle.querySelector('.sun-icon');
const moonIcon = themeToggle.querySelector('.moon-icon');

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'inline';
} else {
    sunIcon.style.display = 'inline';
    moonIcon.style.display = 'none';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'inline';
        if (categoryChart) categoryChart.updateOptions({ theme: { mode: 'dark' } });
    } else {
        sunIcon.style.display = 'inline';
        moonIcon.style.display = 'none';
        if (categoryChart) categoryChart.updateOptions({ theme: { mode: 'light' } });
    }
});

// Remove PDF Reset Logic
removePdf.addEventListener('click', () => {
    allTransactions = [];
    fileInput.value = '';
    
    totalIncomeEl.textContent = '₹0.00';
    totalExpensesEl.textContent = '₹0.00';
    netSavingsEl.textContent = '₹0.00';
    netSavingsEl.className = 'metric-value';
    incomeCountEl.textContent = '0 transactions';
    expenseCountEl.textContent = '0 transactions';
    savingsRateEl.textContent = '0% savings rate';
    
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
    
    searchInput.value = '';
    categoryFilter.value = 'all';
    if (pipelineSteps) {
        pipelineSteps.forEach(s => s.classList.remove('active'));
        if (pipelineSteps.length > 0) pipelineSteps[0].classList.add('active');
    }
    topCategoriesBody.innerHTML = '';
    topSendersBody.innerHTML = '';
    topRecipientsBody.innerHTML = '';
    transactionsBody.innerHTML = '';
    
    dashboard.style.display = 'none';
    uploadSection.style.display = 'block';
    printBtn.style.display = 'none';
    removePdf.style.display = 'none';
    exportAllBtn.style.display = 'none';
    exportFilteredBtn.style.display = 'none';
    mobileBottomNav.classList.remove('visible');
});

// Initialize Lucide Icons on load
if (window.lucide) {
    lucide.createIcons();
}

// Export All transactions CSV
exportAllBtn.addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,Date,Narration,Category,Withdrawal,Deposit,Balance\n";
    allTransactions.forEach(t => {
        const row = `"${t.date}","${t.narration.replace(/"/g, '""')}","${t.category}",${t.withdrawal},${t.deposit},${t.balance}\n`;
        csvContent += row;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hdfc_all_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Export Filtered transactions CSV
exportFilteredBtn.addEventListener('click', () => {
    const query = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;
    
    const filtered = allTransactions.filter(t => {
        const matchesQuery = t.narration.toLowerCase().includes(query);
        const matchesCat = cat === 'all' || t.category === cat;
        return matchesQuery && matchesCat;
    });
    
    let csvContent = "data:text/csv;charset=utf-8,Date,Narration,Category,Withdrawal,Deposit,Balance\n";
    filtered.forEach(t => {
        const row = `"${t.date}","${t.narration.replace(/"/g, '""')}","${t.category}",${t.withdrawal},${t.deposit},${t.balance}\n`;
        csvContent += row;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hdfc_filtered_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Chevron Pipeline filter binding
pipelineSteps.forEach(step => {
    step.addEventListener('click', () => {
        pipelineSteps.forEach(s => s.classList.remove('active'));
        step.classList.add('active');
        
        const filterVal = step.getAttribute('data-filter');
        if (filterVal === 'all') {
            categoryFilter.value = 'all';
            searchInput.value = '';
        } else if (filterVal === 'upi') {
            categoryFilter.value = 'UPI Transfer';
            searchInput.value = '';
        } else if (filterVal === 'bank') {
            categoryFilter.value = 'Bank Transfer';
            searchInput.value = '';
        } else if (filterVal === 'gas') {
            categoryFilter.value = 'Shiv Shakti (HP Gas)';
            searchInput.value = '';
        } else if (filterVal === 'charges') {
            categoryFilter.value = 'Bank Charges';
            searchInput.value = '';
        }
        
        filterAndRenderTable();
    });
});
