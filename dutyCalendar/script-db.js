/*
 * @Author: rtian
 * @Date: 2025-03-20 8:10:38
 * @FilePath: /script-db.js
 * @Description: 值班信息
 变量：formattedDate: 格式 2025-4-1
 函数：generateCalendablank，生成日历基本结构：避免重复生成元素
 函数：fillCalendarDates，填充日历日期：根据年月生成日历日期
 函数：fillDutyDates，在日历日期中显示当月值班日期：高亮显示、添加点击事件
 函数：displayDutyInfo，获取并显示指定日期的值班信息：递归函数处理嵌套数据生成值班表
 函数：createDutyElement，递归函数处理嵌套数据
 函数：getDutyInfo，从localstorage获取指定日期值班信息,如果没有则从数据库获取
 函数：getDutyDays，从localstorage获取年月的值班天数
 函数：getSearchParams，获取url参数
 函数：init，初始化：生成日历基本结构，填充日历日期，显示当日值班信息
*/
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const day = today.getDate();
var todaystr = `${year}-${month + 1}-${day}`;
var screenWidth = window.innerWidth;
var screendisplay = screenWidth > 768 ? 1 : 0;;//获取屏幕宽度，0:电脑端，1:手机端
const weekStart = 1;

window.onload = function () {
    // 页面加载完成后执行的代码
    //生成日历基本结构
    generateCalendablank()
    // 检查 URL 参数中是否包含 date 参数
    // 根据参数设置日期获取指定日期的值班信息
    let formattedDate = todaystr;
    let searchParams = getSearchParams();
    let date = searchParams && searchParams['date']
    if (date && date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        formattedDate = date
    }
    //初始化：生成日历基本结构，填充日历日期，显示当日值班信息
    init(formattedDate)
    const calendarTitle = document.querySelector('#month-year')/**/
    //添加事件：点击日历标题切换上一个月或下一个月
    calendarTitle.addEventListener('click', function (ev) {
        if (ev.target.tagName != 'SPAN') return;
        let span = ev.target.className
        let mm = span == 'prev' ? -1 : span == 'next' ? 1 : 0;
        let cdate = calendarTitle.querySelector('.yearmonth').textContent;
        let [_year, _month] = cdate.split(/年|月/).map(Number);
        _month += mm;
        if (_month == 0) {
            _year--;
            _month = 12;
        }
        if (_month == 13) {
            _year++;
            _month = 1;
        }
        let _formattedDate = `${_year}-${_month}-1`;
        if (mm == 0) _formattedDate = todaystr
        init(_formattedDate)
    });
    const calendarBody = document.getElementById('calendar-body');
    //事件委托：点击日历值班日期显示当日值班信息
    calendarBody.addEventListener('click', async function (ev) {
        let cell = ev.target;
        if (cell.tagName == 'TD' && cell.classList.contains('duty-day')) {
            let _formattedDate = cell.getAttribute('data-date');
            await displayDutyInfo(_formattedDate);
            const dutyInfoContainer = document.getElementById('duty-info-container');
            //滚动到顶部
            dutyInfoContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
            if (screendisplay == 0) {
                calendarBody.className = 'hidecalendar';
                calendarTitle.className = 'hidecalendar';
            }
        }
    })
    const calendarHead = document.getElementById('calendar-head');
    //事件委托：点击日历表头显示当日值班信息
    calendarHead.addEventListener('click', async function (ev) {
        if (screendisplay == 1) return; //电脑端不响应点击表头事件
        let dom = ev.target;
        if (dom.tagName == 'TH') {
            let display = calendarBody.className;
            if (display == 'hidecalendar' || display == '') {
                calendarBody.className = 'showbody';
                calendarTitle.className = 'showtitle';
            } else {
                calendarBody.className = 'hidecalendar';
                calendarTitle.className = 'hidecalendar';
            }
        }
    })

    //窗口大小变化时刷新页面：电脑端和手机端显示不同的日历版式
    window.addEventListener('resize', function () {
        screenWidth = window.innerWidth;
        screendisplay = screenWidth > 768 ? 1 : 0;
        let display = calendarBody.className;
        if (screendisplay == 1 && display == 'hidecalendar') {
            calendarBody.className = 'showbody';
            calendarTitle.className = 'showtitle';
            return;
        }
        if (screendisplay == 0 && display == 'showbody') {
            calendarBody.className = 'hidecalendar';
            calendarTitle.className = 'hidecalendar';
            return;
        }
    });
}
/******************************************************************** */
//初始化：生成日历基本结构，填充日历日期，显示当日值班信息
//参数：formattedDate:指定日期，默认为当前日期
async function init(formattedDate) {
    fillCalendarDates(formattedDate)
    // //日历显示有效值班的日期
    let dutystat = await fillDutyDates(formattedDate)
    // //当日值班信息显示
    if (dutystat) {
        await displayDutyInfo(formattedDate);
    }
}
//生成空白日历结构
function generateCalendablank() {
    // 日历表头：周日、周一、周二、周三、周四、周五、周六
    // 开始日期：日历版式的第一天,周日：0，周一：1；
    const calendarHead = document.getElementById('calendar-head');
    calendarHead.innerHTML = '';
    const row_head = document.createElement('tr');
    var wkarr = ['日', '一', '二', '三', '四', '五', '六'];
    if (weekStart == 1) wkarr = ['一', '二', '三', '四', '五', '六', '日'];
    for (let i = 0; i < 7; i++) {
        const cell = document.createElement('th');
        cell.textContent = wkarr[i];
        row_head.appendChild(cell);
    }
    calendarHead.appendChild(row_head);
    // 日历内容：日期
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            cell.classList.add('empty');
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
    }
}

//日历中填充当月日期
function fillCalendarDates(date) {
    // 计算日历版式的第一天是星期几，月份总天数
    const [year, month, day] = date.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const startingDay = (firstDay.getDay() - weekStart + 7) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const calendarTitle = document.querySelector('#month-year>.yearmonth');
    calendarTitle.textContent = `${year}年${month}月`;
    const calendarBody = document.getElementById('calendar-body');
    const cells = calendarBody.getElementsByTagName('td');
    let days = 1;
    for (let i = 0; i < 6; i++) {
        let flag = days > daysInMonth ? 1 : 0;
        for (let j = 0; j < 7; j++) {
            let cell = cells[i * 7 + j];
            cell.className = 'cell';
            cell.removeAttribute('data-date');
            if (flag) {
                cell.className = 'hidden';
                continue;
            }
            if (i === 0 && j < startingDay || days > daysInMonth) {
                cell.textContent = '';
                cell.className = 'empty';
            } else {
                cell.textContent = days;
                //设置单元格 data-date 属性为完整日期yyyy-mm-dd
                let formattedDate = `${year}-${month}-${days}`;
                cell.setAttribute('data-date', formattedDate);
                if (todaystr === formattedDate) {
                    cell.classList.add('today');
                }
                days++;
            }
        }
    }
}


//将值班日期显示在日历上
async function fillDutyDates(date) {
    const calendarBody = document.getElementById('calendar-body');
    const cells = calendarBody.getElementsByTagName('td');
    //获取当月值班日期
    const dutyDays = await getDutyDays(date);
    if (dutyDays.length == 0) return false;
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const date = cell.getAttribute('data-date');
        if (date) {
            let day = date.split('-')[2];
            if (dutyDays.includes(day)) {
                cell.classList.add('duty-day');
            }
        }
    }
    return true;
}

// 异步获取并显示指定日期的值班信息
async function displayDutyInfo(date) {
    const data = await getDutyInfo(date);
    const dutyInfoContainer = document.getElementById('duty-info-container');
    dutyInfoContainer.innerHTML = '';// 清空容器
    const dateElement = document.createElement('h2');
    dateElement.textContent = `值班日期: ${data['值班日期']}`;
    dutyInfoContainer.appendChild(dateElement);
    const dutyElement = createDutyElement(data.data);
    dutyInfoContainer.appendChild(dutyElement);
}
// 递归函数处理嵌套数据：值班表信息(模版文件duty.json)
function createDutyElement(data, level = 1) {
    const container = document.createElement('div');
    container.classList.add(`duty-items${level}`);
    let dom;
    if (Array.isArray(data)) {
        const valuesdiv = document.createElement('div');
        valuesdiv.classList.add(`duty-values`);
        for (const value of data) {
            const valueElement = document.createElement('div');
            valueElement.classList.add('duty-value');
            let [_name, _value] = value;
            _name = _name.trim().replace('（辅导员）', '<span class="desc">[辅]</span>');
            valueElement.innerHTML = `<span class="name">${_name}</span><span class="tel">${_value.trim()}</span>`;
            valuesdiv.appendChild(valueElement);
        }
        dom = valuesdiv
    } else {
        for (const key in data) {
            const keyElement = document.createElement('div');
            keyElement.classList.add('duty-key', `duty-key${level}`);
            keyElement.textContent = key.trim();
            container.appendChild(keyElement);
            const childElement = createDutyElement(data[key], level + 1);
            const itemElement = document.createElement('div');
            itemElement.classList.add(`duty-item`);
            if (data[key].length === 0 && level == 3) {
                itemElement.style.display = 'none';
            }
            if (childElement.className.includes('duty-values')) {
                itemElement.classList.add('flex');
            }
            itemElement.appendChild(keyElement);
            itemElement.appendChild(childElement);
            container.appendChild(itemElement);
        }
        dom = container
    }
    return dom;
}

//从localstorage获取指定日期值班信息,如果没有则从服务器获取
async function getDutyInfo(date) {
    const dutyInfo = localStorage.getItem('duty-' + date);
    if (dutyInfo && 1 == 1) {//调试用：1==0强制从服务器获取
        return JSON.parse(dutyInfo);
    } else {
        const response = await fetch('/getduty?date=' + date);
        if (response.status !== 200) {
            throw new Error('请求失败');
        }
        const data = await response.json();
        if (data['total'] > 0) {
            localStorage.setItem('duty-' + date, JSON.stringify(data));
        }
        return data;
    }
}
//从localstorage获取年月的值班天数
async function getDutyDays(date) {
    let ym = date.split('-').slice(0, 2).join('-');
    const dutyDays = localStorage.getItem('duty-day-' + ym);
    if (dutyDays) {
        return JSON.parse(dutyDays);
    } else {
        const response = await fetch('/getdate?date=' + date);
        if (response.status !== 200) {
            throw new Error('请求失败');
        }
        const data = await response.json();
        if (data.length > 0) {
            localStorage.setItem('duty-day-' + ym, JSON.stringify(data));
        }
        return data;
    }
}
//获取url参数
function getSearchParams() {
    let searchParams = new URLSearchParams(window.location.search);
    if (searchParams.size === 0) return null;
    let params = {};
    for (let [key, value] of searchParams) {
        params[key] = value;
    }
    return params;
}
