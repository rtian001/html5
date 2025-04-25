const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

// 打开 SQLite 数据库
const db = new sqlite3.Database('值班表.db', (err) => {
    if (err) {
        console.error(err.message);
    }
});

const app = express();
const port = 3000;

// 设置静态资源目录
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

function getdatestring(req) {
    let searchParams = new URLSearchParams(req.url.split('?')[1]);
    let _searchParams = Object.fromEntries(searchParams);
    let date = _searchParams && _searchParams['date'];
    let formattedDate = '';
    if (date && date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        formattedDate = date;
    } else {
        let today = new Date();
        let year = today.getFullYear();
        let month = today.getMonth();
        let day = today.getDate();
        formattedDate = `${year}-${month + 1}-${day}`;
    }
    return formattedDate;
}

// 处理 /getduty 请求
app.get('/getduty', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    let formattedDate = getdatestring(req);
    var wkarr = ['日', '一', '二', '三', '四', '五', '六'];
    let wk = new Date(formattedDate).getDay();
    let wkstr = '周' + wkarr[wk];
    const template = require('./duty.json');
    const dutyFormat = JSON.parse(JSON.stringify(template));
    dutyFormat['值班日期'] = `${formattedDate}(${wkstr})`;
    db.all('SELECT * FROM 值班表 WHERE 日期 = ?', [formattedDate], (err, rows) => {
        if (err) {
            res.send(dutyFormat);
        }
        try {
            dutyFormat['total'] = rows.length;
            const dutyDate = dutyFormat['data'];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                let telinfo = row['值班人员'].split(';').map(n => {
                    // 脱密：打乱值班人员的电话
                    let m = n.split(',');
                    let tel = m[1];
                    let newtel = '';
                    while ((newtel = tel.slice(0, 3) + tel.slice(3).split('').sort(() => Math.random() - 0.5).join(''), tel === newtel));
                    m[1] = newtel;
                    return m;
                });
                if (row['部门类型'].match(/带班校领导|处级干部/)) {
                    dutyDate[row['部门类型']] = telinfo;
                } else {
                    if (row['部门类型'] === '职能部门') {
                        dutyDate[row['部门类型']][row['部门名称']] = telinfo;
                    } else {
                        dutyDate[row['部门类型']][row['部门名称']][row['人员类别']] = telinfo;
                    }
                }
            }
            res.send(dutyFormat);
        } catch (parseErr) {
            res.send(dutyFormat);
        }
    });

});

// 处理 /getdate 请求
app.get('/getdate', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let formattedDate = getdatestring(req);
    let ym = formattedDate.split('-').slice(0, 2).join('-');
    let dates = [];
    db.all('SELECT 日期 FROM 值班表 WHERE 年月 = ?', [ym], (err, rows) => {
        if (err) {
            res.send(dates);
        }
        try {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                let day = row['日期'].split('-')[2];
                if (dates.indexOf(day) === -1) {
                    dates.push(day);
                }
            }
            res.send(dates);
        } catch (err) {
            res.send(dates);
        }
    });
});

// 处理根路径和带日期参数的根路径请求
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// 关闭数据库连接
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});
