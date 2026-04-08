#!/usr/bin/env python3
import os
import re
import json
import shutil
import argparse
from pathlib import Path


class RedundancyRemover:
    def __init__(self, root_dir):
        self.root_dir = Path(root_dir).resolve()
        self.backup_dir = self.root_dir / '.backup'
        self.report_dir = self.root_dir / '.redundancy-report'
        self.alive_files = set()
        self.all_files = set()
        self.redundant_files = []
        self.redundant_functions = []
        self.redundant_classes = []

    def create_backup(self):
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        
        ignore_patterns = shutil.ignore_patterns(
            '.git', '.backup', '.redundancy-report',
            'node_modules', '.trae', 'frp_*'
        )
        
        shutil.copytree(
            self.root_dir,
            self.backup_dir,
            ignore=ignore_patterns
        )
        return True

    def collect_all_files(self):
        exclude_dirs = {'.git', '.backup', '.redundancy-report', 'node_modules', '.trae', 'frp_0.68.0_windows_amd64', 'docs'}
        
        for dirpath, dirnames, filenames in os.walk(self.root_dir):
            dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
            
            for filename in filenames:
                file_path = Path(dirpath) / filename
                rel_path = file_path.relative_to(self.root_dir)
                self.all_files.add(str(rel_path).replace('\\', '/'))

    def analyze_file_dependencies(self):
        app_json_path = self.root_dir / 'miniprogram' / 'app.json'
        if app_json_path.exists():
            with open(app_json_path, 'r', encoding='utf-8') as f:
                app_config = json.load(f)
                
                self.alive_files.add('miniprogram/app.js')
                self.alive_files.add('miniprogram/app.json')
                self.alive_files.add('miniprogram/app.wxss')
                
                if 'pages' in app_config:
                    for page in app_config['pages']:
                        self._add_page_files(page)
                
                if 'subPackages' in app_config:
                    for subpkg in app_config['subPackages']:
                        root = subpkg.get('root', '')
                        for page in subpkg.get('pages', []):
                            full_page = f"{root}/{page}" if root else page
                            self._add_page_files(full_page)
                
                if 'usingComponents' in app_config:
                    for component_path in app_config['usingComponents'].values():
                        self._add_component_files(component_path)

        for file_path in list(self.alive_files):
            self._analyze_file_deps(file_path)

        cloudfunctions_dir = self.root_dir / 'cloudfunctions'
        if cloudfunctions_dir.exists():
            for func_dir in cloudfunctions_dir.iterdir():
                if func_dir.is_dir():
                    index_js = func_dir / 'index.js'
                    if index_js.exists():
                        rel_path = str(index_js.relative_to(self.root_dir)).replace('\\', '/')
                        self.alive_files.add(rel_path)
                        self._analyze_file_deps(rel_path)
        
        self.alive_files = {f for f in self.alive_files if Path(self.root_dir / f).is_file()}

    def _add_page_files(self, page):
        base_path = f'miniprogram/{page}'
        self.alive_files.add(f'{base_path}.js')
        self.alive_files.add(f'{base_path}.json')
        self.alive_files.add(f'{base_path}.wxml')
        self.alive_files.add(f'{base_path}.wxss')

    def _add_component_files(self, component_path):
        if component_path.startswith('/'):
            component_path = component_path[1:]
        base_path = f'miniprogram/{component_path}'
        self.alive_files.add(f'{base_path}.js')
        self.alive_files.add(f'{base_path}.json')
        self.alive_files.add(f'{base_path}.wxml')
        self.alive_files.add(f'{base_path}.wxss')

    def _analyze_file_deps(self, file_path):
        full_path = self.root_dir / file_path
        
        if not full_path.exists():
            return
        
        if file_path.endswith('.js'):
            self._analyze_js_deps(file_path)
        elif file_path.endswith('.json'):
            self._analyze_json_deps(file_path)

    def _analyze_js_deps(self, file_path):
        full_path = self.root_dir / file_path
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            require_pattern = re.compile(r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)')
            import_pattern = re.compile(r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]')
            
            parent_dir = Path(file_path).parent
            
            for match in require_pattern.finditer(content):
                dep_path = match.group(1)
                self._resolve_dep_path(dep_path, parent_dir)
            
            for match in import_pattern.finditer(content):
                dep_path = match.group(1)
                self._resolve_dep_path(dep_path, parent_dir)
                
        except Exception:
            pass

    def _resolve_dep_path(self, dep_path, parent_dir):
        if dep_path.startswith('.'):
            resolved = (parent_dir / dep_path).resolve()
            possible_extensions = ['', '.js', '.json']
            
            for ext in possible_extensions:
                test_path = str(resolved) + ext
                test_full_path = Path(test_path)
                
                if test_full_path.exists():
                    rel_path = test_full_path.relative_to(self.root_dir)
                    rel_path_str = str(rel_path).replace('\\', '/')
                    if rel_path_str not in self.alive_files:
                        self.alive_files.add(rel_path_str)
                        self._analyze_file_deps(rel_path_str)
                    break

    def _analyze_json_deps(self, file_path):
        full_path = self.root_dir / file_path
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                
                if 'usingComponents' in config:
                    parent_dir = Path(file_path).parent
                    
                    for component_path in config['usingComponents'].values():
                        if component_path.startswith('/'):
                            component_path = component_path[1:]
                            self._add_component_files(component_path)
                        elif component_path.startswith('.'):
                            resolved = (parent_dir / component_path).resolve()
                            try:
                                rel_path = resolved.relative_to(self.root_dir)
                                rel_path_str = str(rel_path).replace('\\', '/')
                                self.alive_files.add(f'{rel_path_str}.js')
                                self.alive_files.add(f'{rel_path_str}.json')
                                self.alive_files.add(f'{rel_path_str}.wxml')
                                self.alive_files.add(f'{rel_path_str}.wxss')
                                self._analyze_file_deps(f'{rel_path_str}.js')
                                self._analyze_file_deps(f'{rel_path_str}.json')
                            except ValueError:
                                pass
                                
        except Exception:
            pass

    def find_redundant_files(self):
        non_code_files = {
            '.gitignore', 'project.config.json', 'project.private.config.json',
            'sitemap.json', '.DS_Store'
        }
        
        for file_path in self.all_files:
            if file_path not in self.alive_files:
                file_name = Path(file_path).name
                
                if file_name in non_code_files:
                    continue
                
                if file_path.startswith('.'):
                    continue
                
                if file_path.startswith('docs/'):
                    continue
                
                self.redundant_files.append(file_path)

    def analyze_functions(self):
        function_defs = {}
        function_calls = set()
        
        for file_path in self.alive_files:
            if file_path.endswith('.js'):
                full_path = self.root_dir / file_path
                
                if full_path.exists():
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        func_pattern = re.compile(
                            r'(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function\s*\(|\([^)]*\)\s*=>))',
                            re.MULTILINE
                        )
                        
                        for match in func_pattern.finditer(content):
                            func_name = match.group(1) or match.group(2)
                            if func_name:
                                key = f"{file_path}::{func_name}"
                                function_defs[key] = {
                                    'file': file_path,
                                    'name': func_name,
                                    'line': content[:match.start()].count('\n') + 1
                                }
                        
                        call_pattern = re.compile(r'\b(\w+)\s*\(')
                        for match in call_pattern.finditer(content):
                            call_name = match.group(1)
                            function_calls.add(call_name)
                            
                    except Exception:
                        pass
        
        entry_calls = {
            'Page', 'Component', 'App', 'getApp', 'require',
            'wx', 'setData', 'onLoad', 'onShow', 'onReady',
            'onHide', 'onUnload', 'onPullDownRefresh',
            'onReachBottom', 'onShareAppMessage'
        }
        
        for key, func_info in function_defs.items():
            func_name = func_info['name']
            
            if func_name in entry_calls:
                continue
            
            if func_name not in function_calls:
                self.redundant_functions.append(func_info)

    def analyze_css_classes(self):
        defined_classes = set()
        used_classes = set()
        
        for file_path in self.all_files:
            if file_path.endswith('.wxss') or file_path.endswith('.css'):
                full_path = self.root_dir / file_path
                
                if full_path.exists():
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        class_pattern = re.compile(r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*[{,]')
                        for match in class_pattern.finditer(content):
                            defined_classes.add(match.group(1))
                            
                    except Exception:
                        pass
        
        for file_path in self.alive_files:
            if file_path.endswith('.wxml'):
                full_path = self.root_dir / file_path
                
                if full_path.exists():
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        class_pattern = re.compile(r'class\s*=\s*["\']([^"\']+)["\']')
                        for match in class_pattern.finditer(content):
                            class_list = match.group(1).split()
                            for cls in class_list:
                                used_classes.add(cls)
                                
                    except Exception:
                        pass
        
        for cls in defined_classes:
            if cls not in used_classes:
                self.redundant_classes.append(cls)

    def generate_report(self):
        if not self.report_dir.exists():
            self.report_dir.mkdir()
        
        with open(self.report_dir / 'alive-files.json', 'w', encoding='utf-8') as f:
            json.dump(sorted(list(self.alive_files)), f, ensure_ascii=False, indent=2)
        
        with open(self.report_dir / 'redundant-files.txt', 'w', encoding='utf-8') as f:
            for file_path in sorted(self.redundant_files):
                f.write(f"{file_path}\n")
        
        with open(self.report_dir / 'redundant-functions.txt', 'w', encoding='utf-8') as f:
            for func in sorted(self.redundant_functions, key=lambda x: x['file']):
                f.write(f"{func['file']}:{func['line']} - {func['name']}\n")
        
        with open(self.report_dir / 'redundant-classes.txt', 'w', encoding='utf-8') as f:
            for cls in sorted(self.redundant_classes):
                f.write(f".{cls}\n")

    def run(self, files_only=False, functions_only=False, classes_only=False, backup=True):
        print("=== 项目代码冗余检测 - 反向剔除法 ===")
        print()
        
        if backup:
            print("[1/6] 创建项目备份...", end="", flush=True)
            self.create_backup()
            print(" 完成")
        else:
            print("[1/6] 跳过备份")
        
        print("[2/6] 收集项目文件...", end="", flush=True)
        self.collect_all_files()
        print(" 完成")
        
        if not functions_only and not classes_only:
            print("[3/6] 分析文件依赖关系...", end="", flush=True)
            self.analyze_file_dependencies()
            print(" 完成")
            
            print("[4/6] 检测冗余文件...", end="", flush=True)
            self.find_redundant_files()
            print(" 完成")
        else:
            print("[3/6] 跳过文件依赖分析")
            print("[4/6] 跳过冗余文件检测")
        
        if not files_only and not classes_only:
            print("[5/6] 分析函数调用关系...", end="", flush=True)
            self.analyze_functions()
            print(" 完成")
        else:
            print("[5/6] 跳过函数分析")
        
        if not files_only and not functions_only:
            print("[6/6] 检测冗余样式类...", end="", flush=True)
            self.analyze_css_classes()
            print(" 完成")
        else:
            print("[6/6] 跳过样式类检测")
        
        print()
        print("=== 生成报告...", end="", flush=True)
        self.generate_report()
        print(" 完成")
        
        print()
        print("=== 检测完成 ===")
        print(f"存活文件: {len(self.alive_files)} 个")
        if not functions_only and not classes_only:
            print(f"冗余文件: {len(self.redundant_files)} 个")
        if not files_only and not classes_only:
            print(f"冗余函数: {len(self.redundant_functions)} 个")
        if not files_only and not functions_only:
            print(f"冗余样式类: {len(self.redundant_classes)} 个")
        print()
        print(f"报告已生成到: {self.report_dir}")


def main():
    parser = argparse.ArgumentParser(
        description='项目代码冗余检测 - 反向剔除法'
    )
    parser.add_argument(
        '--root',
        type=str,
        default='.',
        help='项目根目录路径'
    )
    parser.add_argument(
        '--files-only',
        action='store_true',
        help='只检测冗余文件'
    )
    parser.add_argument(
        '--functions-only',
        action='store_true',
        help='只检测冗余函数'
    )
    parser.add_argument(
        '--classes-only',
        action='store_true',
        help='只检测冗余样式类'
    )
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='跳过项目备份'
    )
    
    args = parser.parse_args()
    
    remover = RedundancyRemover(args.root)
    remover.run(
        files_only=args.files_only,
        functions_only=args.functions_only,
        classes_only=args.classes_only,
        backup=not args.no_backup
    )


if __name__ == '__main__':
    main()
