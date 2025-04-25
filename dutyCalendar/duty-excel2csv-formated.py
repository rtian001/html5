from calendar import c
from operator import le
import os
from unittest import result
import pandas as pd
import numpy as np
import datetime
import json
import re
import warnings

warnings.simplefilter(action='ignore', category=FutureWarning)
#获取当前目录路径
current_directory = os.getcwd()

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
    '校领导':'校领导,',
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
def filter_rows_by_date(file_path):
    results=''
    part_file=file_path.replace(target_directory,'')
    #根据part_file匹配part_obj
    level_part=''
    for key in part_keys:
        if key in part_file:
            level_part=part_obj[key]
            break
    sheets = pd.read_excel(file_path, sheet_name=None)
    # 遍历每个sheet
    for sheet_name, df in sheets.items():
        if not df.empty:
            try:
                print(f"正在处理文件: {file_path}, sheet: {sheet_name}")
                part=''
                if "辅导员" in sheet_name or ("辅导员值班表" in part_file and "和" not in part_file):
                    part = "辅导员"
                elif "领导" in sheet_name or ("领导值班表" in part_file and "和" not in part_file):
                    part = "学院领导"
                else:
                    if level_part.startswith('二级学院'):
                        part = "辅导员"
                    
                df = df.replace(np.nan,'')
                for i in range(len(df)):
                        if type(df.iloc[i,0]) is datetime.datetime:
                            df.iloc[i, 0] = df.iloc[i, 0].strftime('%#m月%#d日')
                        elif pd.api.types.is_number(df.iloc[i, 0]):
                                if df.iloc[i, 0]>10000:
                                    df.iloc[i, 0] = pd.to_datetime(
                                        df.iloc[i, 0],
                                        unit='D',
                                        origin=pd.Timestamp('1900-12-30')  # Excel基准日期
                                    ).strftime('%#m月%#d日')
                                else:
                                    df.iloc[i, 0] = str(df.iloc[i, 0])
            except Exception as e:
                print(f"{file_path}: {sheet_name} 处理出错: {e}")
                continue
                # 处理文本
            result = df.astype(str)
            result = result.apply(lambda x: ','.join(x), axis=1)
            result = ';'.join(result).replace(';,', '')
            result =re.sub(r',+', ',', result).split(';')
            result ='\n'.join([level_part+','+part+','+re.sub(r',$','',x) for x in result if re.search(r'\d+月\d+日',x) ] )
            result = result.replace(' ', '')
            results+=result+'\n' 
    return results



# 主程序：获取所有xlsx文件并处理生成csv文件
def main():
    xlsx_files = get_xlsx_files(target_directory)
    results=''
    for file_path in xlsx_files:
        res=filter_rows_by_date(file_path)
        results+=res
    with open(directory+'.csv', 'w', encoding='utf-8') as file:
        file.write(results)

# 读取csv文件，提取指定日期的值班信息生成json格式

# 获取当日值班的所有人员
def get_today_duty(day):
    dt=datetime.datetime.strptime(day.replace('/','-'), '%Y-%m-%d')
    month=dt.month
    if not os.path.exists(dayfile):
        main()
    weeklist=['星期一','星期二','星期三','星期四','星期五','星期六','星期日']
    # 根据日期获取当日星期几
    dday=dt.strftime('%#m月%#d日')
    week=dt.weekday()
    td=day+'('+weeklist[week]+')'
    # 读取csv文件
    with open(dayfile, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    # 筛选包含当日日期的行
    result = [line.strip() for line in lines if dday in line]
    # 生成json格式
    results={'值班日期':td,'带班校领导':'','处级干部':'','职能处室':{},'二级学院':{}}
    for line in result:
        line=line.split(',')
        names=line[5:]
        namelist=[','.join(names[i:i+2]) for i in range(0, len(names), 2)]
        if line[0]=='带班校领导':
                results['带班校领导']=namelist
        elif line[0]=='处级干部':
                results['处级干部']=namelist
        elif line[0]=='职能部门' :
                results['职能处室'][line[1]]=namelist
        else :
            part=line[1]
            if part not in results['二级学院']:
                results['二级学院'][part]={'学院领导':[], '辅导员':[]}
            if line[2]=='学院领导':
                results['二级学院'][part]['学院领导']=namelist
            else:
                results['二级学院'][part]['辅导员']=namelist
    return results

#函数：生成所有日期的值班信息json文件
def get_all_duty():
    for id in range(1,31):
        tday='2025-4-'+str(id)
        res=get_today_duty(tday)
        # 终端打印json格式 缩进
        result=json.dumps(res, indent=4, ensure_ascii=False)
        output_file=os.path.join(current_directory, 'data',tday+'.json')
        with open(output_file, 'w', encoding='utf-8') as file:
            file.write(result)    

def test():
    xlsx_files = get_xlsx_files(target_directory)
    xlsx_file=xlsx_files[1]
    res=filter_rows_by_date(xlsx_file)


# 指定4月份全校值班表目录
directory = '4月份全校值班表'
target_directory = os.path.join(current_directory, directory)
if __name__ == '__main__':
    #读取xlsx指定月份值班表生成csv文件
    #main()
    #读取csv指定月份所有日期的值班信息生成json文件
    #get_all_duty()

    #测试
    #读取指定日期的值班信息生成json格式
    tday='2025-4-10'
    dayfile=directory+'.csv'
    res=get_today_duty(tday)
        # 终端打印json格式 缩进
    result=json.dumps(res, indent=4, ensure_ascii=False)
    print(result)
    


