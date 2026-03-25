import re

def fix_text_content(text):
    # 1. 修复数字中的 'O' -> '0'
    # 匹配模式：数字中间的 O (如 5OO, 1O1) 或 小数点前的 O (如 O.4)
    # 这里采用更安全的策略：如果 O 前后是数字或小数点，则替换
    text = re.sub(r'(?<=\d)O(?=\d)', '0', text)       # 5OO -> 500
    text = re.sub(r'(?<=\d)O\b', '0', text)            # 23O (行尾) -> 230
    text = re.sub(r'\bO(?=\d)', '0', text)             # O.4 -> 0.4
    
    # 2. 修复标点 'o' -> '。'
    # 常见情况：汉字后跟 o，且 o 后是换行或空格或引号
    # 注意：不要替换英文单词中的 o (如 food)，但在纯中文语境下，行尾的 o 基本是句号
    text = re.sub(r'([\u4e00-\u9fa5])o\s*\n', r'\1。\n', text)
    text = re.sub(r'([\u4e00-\u9fa5])o([，,；;：:””])', r'\1。\2', text)
    # 针对文中大量的 "行为o\n" 这种情况
    text = re.sub(r'行为o', '行为。', text)
    text = re.sub(r'研究o', '研究。', text)
    text = re.sub(r'变质o', '变质。', text)
    
    # 3. 清理页眉页脚噪点
    # 移除类似 "●4● 饮食营养 5OO忌" 或 ".16. 饮食营养 5OO忌" 的独立行
    text = re.sub(r'\n[●\.]?\d+[●\.]?\s*饮食营养\s*\d+忌\s*\n', '\n', text)
    # 移除多余的分割线 (如 **********)
    text = re.sub(r'\n[\*\-]{10,}\n', '\n', text)
    
    # 4. 优化条目格式
    # 确保 "数字. 标题" 格式统一，例如 "421.食用油" -> "421. 食用油"
    text = re.sub(r'(\d+)\.([\u4e00-\u9fa5])', r'\1. \2', text)
    
    # 5. 二次检查：清理可能残留的孤立 'O' (如果是纯数字上下文)
    # 这一步比较激进，视情况使用。针对文中 "5OO" 这种已经被第一步处理的情况，这里做补充
    # 如果文中还有 "第 O 章" 这种，可能需要手动规则，但目前看主要是数字
    
    return text

# 读取文件 (假设文件名为 '中国饮食500忌.txt')
input_file = '中国饮食500忌.txt'
output_file = '中国饮食500忌_修复版.txt'

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixed_content = fix_text_content(content)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
        
    print(f"✅ 修复完成！已保存至 {output_file}")
    print("主要修复内容：")
    print("  - 数字 'O' 已修正为 '0' (如 5OO -> 500)")
    print("  - 标点 'o' 已修正为 '。'")
    print("  - 页眉页脚噪点已移除")
    print("  - 条目格式已优化")

except FileNotFoundError:
    print(f"❌ 错误：找不到文件 {input_file}，请确保文件在当前目录下。")
except Exception as e:
    print(f"❌ 发生错误：{e}")