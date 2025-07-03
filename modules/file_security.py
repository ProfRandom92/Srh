"""
File Security Analyzer Module
Analyzes file systems for security vulnerabilities, permissions issues, and suspicious files.
"""

import os
import stat
import hashlib
import time
from datetime import datetime
from colorama import Fore, Style
from tabulate import tabulate
import re

class FileSecurityAnalyzer:
    def __init__(self):
        self.suspicious_extensions = [
            '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar',
            '.vbs', '.js', '.ps1', '.sh', '.py', '.pl', '.php'
        ]
        
        self.sensitive_files = [
            'passwd', 'shadow', 'hosts', 'ssh_config', 'authorized_keys',
            'id_rsa', 'id_dsa', 'config', '.htpasswd', '.htaccess',
            'web.config', 'database.yml', '.env', 'secrets.json'
        ]
        
        self.results = {
            'world_writable': [],
            'suid_files': [],
            'sgid_files': [],
            'suspicious_files': [],
            'sensitive_files': [],
            'large_files': [],
            'recent_files': [],
            'hidden_files': [],
            'permission_issues': []
        }
    
    def check_file_permissions(self, filepath):
        """Check file permissions for security issues"""
        try:
            file_stat = os.stat(filepath)
            mode = file_stat.st_mode
            
            issues = []
            
            # Check if world writable
            if mode & stat.S_IWOTH:
                issues.append('world_writable')
            
            # Check for SUID bit
            if mode & stat.S_ISUID:
                issues.append('suid')
            
            # Check for SGID bit
            if mode & stat.S_ISGID:
                issues.append('sgid')
            
            return issues, file_stat
            
        except (OSError, PermissionError):
            return [], None
    
    def is_suspicious_file(self, filename, filepath):
        """Check if file is potentially suspicious"""
        filename_lower = filename.lower()
        
        # Check extension
        for ext in self.suspicious_extensions:
            if filename_lower.endswith(ext):
                return True, f"Suspicious extension: {ext}"
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'.*backdoor.*', r'.*malware.*', r'.*virus.*', r'.*trojan.*',
            r'.*keylog.*', r'.*stealer.*', r'.*payload.*', r'.*exploit.*'
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, filename_lower):
                return True, f"Suspicious filename pattern: {pattern}"
        
        return False, ""
    
    def is_sensitive_file(self, filename):
        """Check if file contains sensitive information"""
        filename_lower = filename.lower()
        
        for sensitive in self.sensitive_files:
            if sensitive in filename_lower:
                return True
        
        # Check for key/certificate files
        if any(ext in filename_lower for ext in ['.key', '.pem', '.crt', '.p12', '.pfx']):
            return True
        
        # Check for database files
        if any(ext in filename_lower for ext in ['.db', '.sqlite', '.mdb']):
            return True
        
        return False
    
    def calculate_file_hash(self, filepath):
        """Calculate SHA256 hash of file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(filepath, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except:
            return None
    
    def analyze_file(self, filepath):
        """Analyze a single file for security issues"""
        filename = os.path.basename(filepath)
        
        try:
            # Get file stats
            file_stat = os.stat(filepath)
            file_size = file_stat.st_size
            mod_time = file_stat.st_mtime
            
            # Check permissions
            perm_issues, _ = self.check_file_permissions(filepath)
            
            # Check if suspicious
            is_suspicious, suspicious_reason = self.is_suspicious_file(filename, filepath)
            
            # Check if sensitive
            is_sensitive = self.is_sensitive_file(filename)
            
            # Check if recently modified (last 7 days)
            is_recent = (time.time() - mod_time) < (7 * 24 * 3600)
            
            # Check if large file (>100MB)
            is_large = file_size > (100 * 1024 * 1024)
            
            # Check if hidden file
            is_hidden = filename.startswith('.')
            
            file_info = {
                'path': filepath,
                'filename': filename,
                'size': file_size,
                'mod_time': datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d %H:%M:%S'),
                'permissions': oct(file_stat.st_mode)[-3:],
                'owner': file_stat.st_uid,
                'group': file_stat.st_gid
            }
            
            # Store results based on findings
            if 'world_writable' in perm_issues:
                self.results['world_writable'].append(file_info)
            
            if 'suid' in perm_issues:
                self.results['suid_files'].append(file_info)
            
            if 'sgid' in perm_issues:
                self.results['sgid_files'].append(file_info)
            
            if is_suspicious:
                file_info['reason'] = suspicious_reason
                self.results['suspicious_files'].append(file_info)
            
            if is_sensitive:
                self.results['sensitive_files'].append(file_info)
            
            if is_large:
                self.results['large_files'].append(file_info)
            
            if is_recent:
                self.results['recent_files'].append(file_info)
            
            if is_hidden and not filename.startswith('..'):
                self.results['hidden_files'].append(file_info)
            
        except (OSError, PermissionError) as e:
            pass  # Skip files we can't access
    
    def analyze_directory(self, path, recursive=False):
        """Analyze a directory for security issues"""
        print(f"{Fore.BLUE}[*] Analyzing directory: {path}{Style.RESET_ALL}")
        
        # Reset results
        for key in self.results:
            self.results[key] = []
        
        file_count = 0
        
        try:
            if recursive:
                for root, dirs, files in os.walk(path):
                    for file in files:
                        filepath = os.path.join(root, file)
                        self.analyze_file(filepath)
                        file_count += 1
                        
                        if file_count % 100 == 0:
                            print(f"{Fore.CYAN}[*] Processed {file_count} files...{Style.RESET_ALL}")
            else:
                for item in os.listdir(path):
                    filepath = os.path.join(path, item)
                    if os.path.isfile(filepath):
                        self.analyze_file(filepath)
                        file_count += 1
        
        except PermissionError:
            print(f"{Fore.RED}[!] Permission denied accessing: {path}{Style.RESET_ALL}")
        
        print(f"{Fore.GREEN}[+] Analysis complete. Processed {file_count} files.{Style.RESET_ALL}")
        return self.results
    
    def display_results(self, results):
        """Display analysis results"""
        print(f"\n{Fore.GREEN}[+] File Security Analysis Results{Style.RESET_ALL}")
        
        # World writable files
        if results['world_writable']:
            print(f"\n{Fore.RED}[!] World Writable Files ({len(results['world_writable'])}){Style.RESET_ALL}")
            table_data = []
            for file_info in results['world_writable'][:10]:  # Show top 10
                table_data.append([
                    file_info['filename'],
                    file_info['permissions'],
                    self.format_size(file_info['size']),
                    file_info['path'][:50] + "..." if len(file_info['path']) > 50 else file_info['path']
                ])
            print(tabulate(table_data, headers=['Filename', 'Permissions', 'Size', 'Path'], tablefmt='grid'))
        
        # SUID files
        if results['suid_files']:
            print(f"\n{Fore.RED}[!] SUID Files ({len(results['suid_files'])}){Style.RESET_ALL}")
            table_data = []
            for file_info in results['suid_files'][:10]:
                table_data.append([
                    file_info['filename'],
                    file_info['permissions'],
                    file_info['owner'],
                    file_info['path'][:50] + "..." if len(file_info['path']) > 50 else file_info['path']
                ])
            print(tabulate(table_data, headers=['Filename', 'Permissions', 'Owner', 'Path'], tablefmt='grid'))
        
        # Suspicious files
        if results['suspicious_files']:
            print(f"\n{Fore.YELLOW}[!] Suspicious Files ({len(results['suspicious_files'])}){Style.RESET_ALL}")
            table_data = []
            for file_info in results['suspicious_files'][:10]:
                table_data.append([
                    file_info['filename'],
                    file_info.get('reason', 'Unknown'),
                    self.format_size(file_info['size']),
                    file_info['mod_time']
                ])
            print(tabulate(table_data, headers=['Filename', 'Reason', 'Size', 'Modified'], tablefmt='grid'))
        
        # Sensitive files
        if results['sensitive_files']:
            print(f"\n{Fore.CYAN}[*] Sensitive Files ({len(results['sensitive_files'])}){Style.RESET_ALL}")
            table_data = []
            for file_info in results['sensitive_files'][:10]:
                table_data.append([
                    file_info['filename'],
                    file_info['permissions'],
                    self.format_size(file_info['size']),
                    file_info['path'][:50] + "..." if len(file_info['path']) > 50 else file_info['path']
                ])
            print(tabulate(table_data, headers=['Filename', 'Permissions', 'Size', 'Path'], tablefmt='grid'))
        
        # Summary
        print(f"\n{Fore.CYAN}[*] Summary:{Style.RESET_ALL}")
        summary_data = [
            ['World Writable Files', len(results['world_writable'])],
            ['SUID Files', len(results['suid_files'])],
            ['SGID Files', len(results['sgid_files'])],
            ['Suspicious Files', len(results['suspicious_files'])],
            ['Sensitive Files', len(results['sensitive_files'])],
            ['Large Files (>100MB)', len(results['large_files'])],
            ['Recently Modified', len(results['recent_files'])],
            ['Hidden Files', len(results['hidden_files'])]
        ]
        print(tabulate(summary_data, headers=['Category', 'Count'], tablefmt='simple'))
    
    def format_size(self, size_bytes):
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"