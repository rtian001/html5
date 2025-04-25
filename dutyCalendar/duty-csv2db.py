import csv
import sqlite3
from datetime import datetime
import random

# 定义 CSV 文件路径和 SQLite 数据库文件路径
csv_file = 'g:/python2025/excel/backup/4月份全校值班表.csv'
db_file = 'g:/python2025/excel/值班表.db'

# 连接到 SQLite 数据库
conn = sqlite3.connect(db_file)
cursor = conn.cursor()
# try:
#     cursor.execute('ALTER TABLE 值班表 ADD COLUMN 部门名称 TEXT')
# except sqlite3.OperationalError:
#     print('部门名称字段已存在，无需添加。')

# 创建一个名为 '值班表' 的表，将年月字段调整到第一个位置，并添加部门名称字段
cursor.execute('''
CREATE TABLE IF NOT EXISTS 值班表 (
    年月 TEXT,
    部门类型 TEXT,
    部门名称 TEXT,
    人员类别 TEXT,
    日期 TEXT,
    星期 TEXT,
    值班人员 TEXT
)
''')

# 清空表中的所有数据**********************调整数据或重新提交时先清空原数据表
# cursor.execute('DELETE FROM 值班表')

# 打开 CSV 文件并逐行插入数据
with open(csv_file, 'r', encoding='utf-8', newline='') as file:
    reader = csv.reader(file)
    for row in reader:
        # 提取人员和电话信息
        personnel_info = row[5:]
        # i+1是电话号码，i是姓名，
        # 随机打乱电话号码后8位
        for i in range(0, len(personnel_info), 2):
            tel=personnel_info[i+1]
            # 随机排序打乱电话号码后8位***************************************************
            if len(tel) == 11:
                tel_new = tel[:3] + ''.join(random.sample(tel[3:], len(tel[3:])))
                while tel_new == tel:
                    tel_new = tel[:3] + ''.join(random.sample(tel[3:], len(tel[3:])))
                personnel_info[i+1] = tel_new
        # 合并人员和电话信息，使用分号分隔
        combined_str=[','.join(personnel_info[i:i+2]) for i in range(0, len(personnel_info), 2)]
        combined_str = ';'.join(filter(None, combined_str))
        
        # 从日期中提取年月
        date_parts = row[3].split('月')
        year = '2025'  # 假设年份为 2025
        month = date_parts[0]
        year_month = f"{year}-{month}"

        # 将日期转换为 yyyy-m-d 格式
        try:
            day = date_parts[1].replace('日', '')
            new_date = f"{year}-{month}-{day}"
            # 验证日期格式
            datetime.strptime(new_date, '%Y-%m-%d')
        except ValueError:
            print(f"无效日期: {row[3]}，跳过该行")
            continue

        # 插入数据
        cursor.execute('''
        INSERT INTO 值班表 (年月, 部门类型, 部门名称, 人员类别, 日期, 星期, 值班人员)
        VALUES (?,?,?,?,?,?,?)
        ''', (year_month, row[0], row[1], row[2], new_date, row[4], combined_str))

# 提交更改并关闭连接
conn.commit()
conn.close()

print('数据已成功导入到 SQLite 数据库')
