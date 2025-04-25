const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 打开 SQLite 数据库
const db = new sqlite3.Database('值班表.db', (err) => {
    if (err) {
        console.error(err.message);
    }
});

function getdatestring(req) {
    let searchParams = new URLSearchParams(req.url.split('?')[1]);
    let _searchParams = Object.fromEntries(searchParams);
    let date = _searchParams && _searchParams['date']
    let formattedDate = '';
    if (date && date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        formattedDate = date
    } else {
        let today = new Date();
        let year = today.getFullYear();
        let month = today.getMonth();
        let day = today.getDate();
        formattedDate = `${year}-${month + 1}-${day}`;
    }
    return formattedDate;
}
// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    if (req.url.startsWith('/getduty') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // 获取查询参数中的日期
        let formattedDate = getdatestring(req);
        template = fs.readFileSync(path.join(__dirname, 'duty.json'), 'utf8')
        // 查询值班表中的日期
        db.all('SELECT * FROM 值班表 WHERE 日期 = ?', [formattedDate], (err, rows) => {
            if (err) {
                res.end(template);
            }
            try {
                const dutyFormat = JSON.parse(template);
                dutyFormat['值班日期'] = `${rows[0]['日期']}(${rows[0]['星期']})`;
                const dutyDate = dutyFormat['data'];
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    let telinfo = row['值班人员'].split(';').map(n => {
                        //脱密：打乱值班人员的电话
                        let m = n.split(',')
                        let tel = m[1];
                        let newtel = '';
                        while (newtel = tel.slice(0, 3) + tel.slice(3).split('').sort(() => Math.random() - 0.5).join(''), tel == newtel);
                        m[1] = newtel;
                        return m;
                    });
                    if (row['部门类型'].match(/带班校领导|处级干部/)) {
                        dutyDate[row['部门类型']] = telinfo;
                    } else {
                        if (row['部门类型'] == '职能部门') {
                            dutyDate[row['部门类型']][row['部门名称']] = telinfo;
                        }
                        else {
                            dutyDate[row['部门类型']][row['部门名称']][row['人员类别']] = telinfo;
                        }
                    }
                }
                res.end(JSON.stringify(dutyFormat));
            } catch (parseErr) {
                res.end(template);
            }
        });
    } else if (req.url.startsWith('/getdate') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        let formattedDate = getdatestring(req);
        let ym = formattedDate.split('-').slice(0, 2).join('-');
        db.all('SELECT 日期 FROM 值班表 WHERE 年月 = ?', [ym], (err, rows) => {
            // if (err) {
            //     res.writeHead(500, { 'Content-Type': 'text/plain' });
            //     res.end('Internal Server Error');
            //     return;
            // }
            let dates = [];
            try {
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    let day = row['日期'].split('-')[2];
                    if (dates.indexOf(day) == -1)
                        dates.push(row['日期'].split('-')[2]);
                }
            } catch (err) {
                console.error(err.message);
            }
            res.end(JSON.stringify(dates));
        })

    } else if (req.url === '/' || req.url.startsWith('/?date=')) {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        const filePath = path.join(__dirname, req.url);
        fs.stat(filePath, (err, stats) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            } else if (stats.isFile()) {
                let contentType = 'text/plain';
                if (filePath.endsWith('.js')) {
                    contentType = 'application/javascript';
                } else if (filePath.endsWith('.css')) {
                    contentType = 'text/css';
                }
                fs.readFile(filePath, (readErr, data) => {
                    if (readErr) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    } else {
                        res.writeHead(200, { 'Content-Type': contentType });
                        res.end(data);
                    }
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });
    }
});

// 启动服务器
const port = 3000;
server.listen(port, () => {
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
