import pandas as pd
import numpy as np
import os
import re
from datetime import datetime
import sqlite3
year='2025'
part_obj={
    '会计':'二级学院,会计学院',
    '信息':'二级学院,信息工程学院',
    '信工':'二级学院,信息工程学院',
    '商':'二级学院,商学院',
    '土木':'二级学院,土木工程学院',
    '土工':'二级学院,土木工程学院',
    '外语':'二级学院,外国语学院',
    '外国语':'二级学院,外国语学院',
    '教育':'二级学院,教育学院',
    '文传':'二级学院,文传学院',
    '文化':'二级学院,文传学院',
    '智能':'二级学院,智能工程学院',
    '管理':'二级学院,管理学院',
    '艺':'二级学院,艺术设计学院',
    '金融':'二级学院,金融学院',
    '统计':'二级学院,统计学院',
    '保卫':'职能部门,保卫处',
    '校领导':'带班校领导,',
    '学工':'职能部门,学生处',
    '学生':'职能部门,学生处',
    '网络':'职能部门,网络中心',
    '宣传':'职能部门,宣传部',
    '宿管':'职能部门,宿管处',
    '宿舍':'职能部门,宿管处',
    '总务':'职能部门,总务处维修科',
    '维修':'职能部门,总务处维修科',
    '处级':'处级干部,'
}
part_keys=list(part_obj.keys())
# 函数：获取指定目录下的所有xlsx文件
def get_xlsx_files(directory):
    xlsx_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.xlsx'):
                xlsx_files.append(os.path.join(root, file))
    return xlsx_files

# 函数： 使用pandas读取xlsx文件的前3个sheet
def getdata_from_excel(file_path):
    results=[]
    paths=file_path.replace(target_directory,'')
    paths=paths.split('\\')[1:]
    sheets = pd.read_excel(file_path, sheet_name=None)
    # 遍历每个sheet
    for sheet_name, df in sheets.items():
        if not df.empty:
            try:
                print(f"正在处理文件: {file_path}, sheet: {sheet_name}")
                #-----------根据excel表格的标题和sheet名称，文件名，目录名；提取部门类型，部门名称，人员类型
                title=str(df.iloc[0]).split('\n')[0]
                patharr=[title,sheet_name]+paths[::-1]
                pathstr=','.join(patharr)
                for key in part_keys:
                    if key in pathstr:
                        level_part=part_obj[key]+','
                        if level_part.startswith('二级学院'):
                            for part in patharr:
                                if '辅导员' in part:
                                    level_part+='辅导员'
                                    break
                                if '领导' in part :
                                    level_part+='学院领导'
                                    break
                        break
                #----------------------------------------------------------------------------------
                df = df.replace(np.nan,'')
                for i in range(len(df)):
                        if type(df.iloc[i,0]) is datetime:
                            df.iloc[i, 0] = df.iloc[i, 0].strftime(f'{year}-%#m-%#d')
                        elif pd.api.types.is_number(df.iloc[i, 0]):
                                if df.iloc[i, 0]>10000:
                                    df.iloc[i, 0] = pd.to_datetime(
                                        df.iloc[i, 0],
                                        unit='D',
                                        origin=pd.Timestamp('1900-12-30')  # Excel基准日期
                                    ).strftime(f'{year}-%#m-%#d')
                                else:
                                    df.iloc[i, 0] = str(df.iloc[i, 0])
                        else:
                            cdate = str(df.iloc[i, 0])
                            if re.search(r'\d+月\d+日',cdate):
                                cdatestr=re.split(r'[年月日]',cdate[:-1])[-2:]
                                newdate=f'{year}-{cdatestr[0]}-{cdatestr[1]}'
                                df.iloc[i, 0] = newdate
            except Exception as e:
                print(f"{file_path}: {sheet_name} 处理出错: {e}")
                continue
                # 处理文本
            result = df.astype(str)
            result = result.apply(lambda x: ','.join(x), axis=1)
            result = ';'.join(result).replace(';,', '').replace(' ', '').replace('（辅导员）','[辅]')
            result =re.sub(r',+', ',', result).split(';')
            resarr=[level_part+','+re.sub(r',$','',x) for x in result if re.search(r'\d+-\d+-\d+',x) ]
            resarr=[x.split(',') for x in resarr]
            resarr=[x[3:4]+x[:3]+[';'.join([','.join(x[5:][i:i+2]) for i in range(0,len(x[5:]),2)])] for x in resarr]
            results+=resarr
    return results

# 主程序：获取所有xlsx文件并处理生成csv文件
def main():
    results=[]
    # 获取所有xlsx文件
    xlsx_files = get_xlsx_files(target_directory)
    # 遍历每个xlsx文件获取数据
    for file_path in xlsx_files:
        res=getdata_from_excel(file_path)
        results+=res
    # 写入数据库
    for row in results:
        cursor.execute('''
        INSERT INTO 值班表 (日期, 部门类型, 部门名称, 人员类别, 值班人员)
        VALUES (?,?,?,?,?)
        ''', (row[0], row[1], row[2], row[3], row[4]))

current_directory = os.getcwd()
target_directory ="3月份全校值班表"
db_file = 'duty.db'
if __name__ == '__main__':
    # 连接到 SQLite 数据库
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    # 创建一个名为 '值班表' 的表，将年月字段调整到第一个位置，并添加部门名称字段
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS 值班表 (
        日期 TEXT,
        部门类型 TEXT,
        部门名称 TEXT,
        人员类别 TEXT,
        值班人员 TEXT
    )
    ''')
    main()
    # 提交更改并关闭连接
    conn.commit()
    conn.close()
    # tdate=datetime.strptime('2024年4月1日','%Y年%m月%d日').strftime('%Y-%m-%d')
    # print(tdate)
