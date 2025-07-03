"""
Log Analyzer Module
Analyzes log files for security events, suspicious activities, and potential threats.
"""

import re
import os
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from colorama import Fore, Style
from tabulate import tabulate
import gzip

class LogAnalyzer:
    def __init__(self):
        self.security_patterns = {
            'failed_login': [
                r'Failed password for.*from (\d+\.\d+\.\d+\.\d+)',
                r'authentication failure.*rhost=(\d+\.\d+\.\d+\.\d+)',
                r'Invalid user.*from (\d+\.\d+\.\d+\.\d+)',
                r'Failed login.*from (\d+\.\d+\.\d+\.\d+)'
            ],
            'successful_login': [
                r'Accepted password for.*from (\d+\.\d+\.\d+\.\d+)',
                r'Accepted publickey for.*from (\d+\.\d+\.\d+\.\d+)',
                r'session opened for user.*from (\d+\.\d+\.\d+\.\d+)'
            ],
            'privilege_escalation': [
                r'sudo.*COMMAND=',
                r'su:.*session opened',
                r'POSSIBLE BREAK-IN ATTEMPT'
            ],
            'network_scan': [
                r'Connection from (\d+\.\d+\.\d+\.\d+).*closed',
                r'Did not receive identification string from (\d+\.\d+\.\d+\.\d+)',
                r'Connection.*closed \[preauth\]'
            ],
            'web_attacks': [
                r'(GET|POST).*(\.\./|\.\.\%2f)',  # Directory traversal
                r'(GET|POST).*(union|select|insert|drop|delete).*=',  # SQL injection
                r'(GET|POST).*(<script|javascript:|onclick=)',  # XSS
                r'(GET|POST).*(cmd=|exec=|system=)',  # Command injection
            ],
            'malware_indicators': [
                r'(trojan|virus|malware|backdoor|rootkit)',
                r'suspicious.*file.*detected',
                r'quarantine.*threat'
            ],
            'firewall_blocks': [
                r'BLOCK.*SRC=(\d+\.\d+\.\d+\.\d+)',
                r'DROP.*SRC=(\d+\.\d+\.\d+\.\d+)',
                r'DENY.*from (\d+\.\d+\.\d+\.\d+)'
            ]
        }
        
        self.suspicious_ips = set()
        self.failed_login_attempts = defaultdict(int)
        self.events = []
        
    def read_log_file(self, filepath):
        """Read log file (supports compressed files)"""
        lines = []
        
        try:
            if filepath.endswith('.gz'):
                with gzip.open(filepath, 'rt', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
            else:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
        except Exception as e:
            print(f"{Fore.RED}[!] Error reading log file: {str(e)}{Style.RESET_ALL}")
        
        return lines
    
    def parse_timestamp(self, line):
        """Extract timestamp from log line"""
        # Common timestamp patterns
        timestamp_patterns = [
            r'^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})',  # Dec 25 14:30:45
            r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})',  # 2023-12-25 14:30:45
            r'^(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2})',  # 12/25/2023 14:30:45
            r'^\[(\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2})'   # [25/Dec/2023:14:30:45
        ]
        
        for pattern in timestamp_patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(1)
        
        return None
    
    def extract_ip_addresses(self, line):
        """Extract IP addresses from log line"""
        ip_pattern = r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b'
        return re.findall(ip_pattern, line)
    
    def analyze_failed_logins(self, lines):
        """Analyze failed login attempts"""
        failed_logins = []
        ip_attempts = defaultdict(int)
        
        for line in lines:
            for pattern in self.security_patterns['failed_login']:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    ip = match.group(1) if match.groups() else None
                    timestamp = self.parse_timestamp(line)
                    
                    event = {
                        'type': 'Failed Login',
                        'timestamp': timestamp,
                        'ip': ip,
                        'line': line.strip()
                    }
                    failed_logins.append(event)
                    
                    if ip:
                        ip_attempts[ip] += 1
                        self.suspicious_ips.add(ip)
        
        return failed_logins, ip_attempts
    
    def analyze_web_attacks(self, lines):
        """Analyze web-based attacks"""
        web_attacks = []
        
        for line in lines:
            for pattern in self.security_patterns['web_attacks']:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    timestamp = self.parse_timestamp(line)
                    ips = self.extract_ip_addresses(line)
                    
                    attack_type = "Unknown"
                    if 'union' in line.lower() or 'select' in line.lower():
                        attack_type = "SQL Injection"
                    elif 'script' in line.lower() or 'javascript' in line.lower():
                        attack_type = "Cross-Site Scripting (XSS)"
                    elif '..' in line:
                        attack_type = "Directory Traversal"
                    elif 'cmd=' in line.lower() or 'exec=' in line.lower():
                        attack_type = "Command Injection"
                    
                    event = {
                        'type': f'Web Attack ({attack_type})',
                        'timestamp': timestamp,
                        'ip': ips[0] if ips else 'Unknown',
                        'line': line.strip()
                    }
                    web_attacks.append(event)
                    
                    for ip in ips:
                        self.suspicious_ips.add(ip)
        
        return web_attacks
    
    def analyze_privilege_escalation(self, lines):
        """Analyze privilege escalation attempts"""
        priv_escalation = []
        
        for line in lines:
            for pattern in self.security_patterns['privilege_escalation']:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    timestamp = self.parse_timestamp(line)
                    ips = self.extract_ip_addresses(line)
                    
                    event = {
                        'type': 'Privilege Escalation',
                        'timestamp': timestamp,
                        'ip': ips[0] if ips else 'Local',
                        'line': line.strip()
                    }
                    priv_escalation.append(event)
        
        return priv_escalation
    
    def analyze_network_scans(self, lines):
        """Analyze network scanning activities"""
        network_scans = []
        scan_ips = defaultdict(int)
        
        for line in lines:
            for pattern in self.security_patterns['network_scan']:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    ip = match.group(1) if match.groups() else None
                    timestamp = self.parse_timestamp(line)
                    
                    event = {
                        'type': 'Network Scan',
                        'timestamp': timestamp,
                        'ip': ip,
                        'line': line.strip()
                    }
                    network_scans.append(event)
                    
                    if ip:
                        scan_ips[ip] += 1
                        self.suspicious_ips.add(ip)
        
        return network_scans, scan_ips
    
    def detect_brute_force_attacks(self, failed_logins, threshold=5):
        """Detect brute force attacks based on failed login attempts"""
        brute_force_ips = {}
        
        for event in failed_logins:
            ip = event.get('ip')
            if ip:
                self.failed_login_attempts[ip] += 1
        
        for ip, count in self.failed_login_attempts.items():
            if count >= threshold:
                brute_force_ips[ip] = count
        
        return brute_force_ips
    
    def analyze_logs(self, logfile, custom_pattern=None):
        """Main log analysis function"""
        print(f"{Fore.BLUE}[*] Analyzing log file: {logfile}...{Style.RESET_ALL}")
        
        if not os.path.exists(logfile):
            print(f"{Fore.RED}[!] Log file not found: {logfile}{Style.RESET_ALL}")
            return {}
        
        # Read log file
        lines = self.read_log_file(logfile)
        
        if not lines:
            print(f"{Fore.RED}[!] No data found in log file{Style.RESET_ALL}")
            return {}
        
        print(f"{Fore.CYAN}[*] Processing {len(lines)} log entries...{Style.RESET_ALL}")
        
        # Reset analysis data
        self.events = []
        self.suspicious_ips = set()
        self.failed_login_attempts = defaultdict(int)
        
        # Perform analysis
        failed_logins, login_attempts = self.analyze_failed_logins(lines)
        web_attacks = self.analyze_web_attacks(lines)
        priv_escalation = self.analyze_privilege_escalation(lines)
        network_scans, scan_attempts = self.analyze_network_scans(lines)
        
        # Custom pattern search
        custom_events = []
        if custom_pattern:
            print(f"{Fore.CYAN}[*] Searching for custom pattern: {custom_pattern}...{Style.RESET_ALL}")
            for line in lines:
                if re.search(custom_pattern, line, re.IGNORECASE):
                    timestamp = self.parse_timestamp(line)
                    ips = self.extract_ip_addresses(line)
                    
                    event = {
                        'type': 'Custom Pattern Match',
                        'timestamp': timestamp,
                        'ip': ips[0] if ips else 'Unknown',
                        'line': line.strip()
                    }
                    custom_events.append(event)
        
        # Combine all events
        all_events = failed_logins + web_attacks + priv_escalation + network_scans + custom_events
        
        # Detect brute force attacks
        brute_force_ips = self.detect_brute_force_attacks(failed_logins)
        
        # Create results summary
        results = {
            'total_events': len(all_events),
            'failed_logins': len(failed_logins),
            'web_attacks': len(web_attacks),
            'privilege_escalation': len(priv_escalation),
            'network_scans': len(network_scans),
            'custom_matches': len(custom_events),
            'suspicious_ips': len(self.suspicious_ips),
            'brute_force_ips': len(brute_force_ips),
            'events': all_events,
            'top_attackers': dict(Counter(self.failed_login_attempts).most_common(10)),
            'brute_force_details': brute_force_ips
        }
        
        return results
    
    def display_results(self, results):
        """Display log analysis results"""
        if not results:
            return
        
        print(f"\n{Fore.GREEN}[+] Log Analysis Results{Style.RESET_ALL}")
        
        # Summary statistics
        print(f"\n{Fore.CYAN}[*] Summary:{Style.RESET_ALL}")
        summary_data = [
            ['Total Security Events', results['total_events']],
            ['Failed Login Attempts', results['failed_logins']],
            ['Web Attacks', results['web_attacks']],
            ['Privilege Escalation', results['privilege_escalation']],
            ['Network Scans', results['network_scans']],
            ['Custom Pattern Matches', results['custom_matches']],
            ['Suspicious IP Addresses', results['suspicious_ips']],
            ['Potential Brute Force IPs', results['brute_force_ips']]
        ]
        print(tabulate(summary_data, headers=['Category', 'Count'], tablefmt='simple'))
        
        # Top attackers
        if results['top_attackers']:
            print(f"\n{Fore.RED}[!] Top Attacking IP Addresses:{Style.RESET_ALL}")
            attacker_data = []
            for ip, count in list(results['top_attackers'].items())[:10]:
                attacker_data.append([ip, count])
            print(tabulate(attacker_data, headers=['IP Address', 'Failed Attempts'], tablefmt='grid'))
        
        # Brute force attacks
        if results['brute_force_details']:
            print(f"\n{Fore.RED}[!] Potential Brute Force Attacks:{Style.RESET_ALL}")
            bf_data = []
            for ip, count in results['brute_force_details'].items():
                bf_data.append([ip, count, 'High Risk'])
            print(tabulate(bf_data, headers=['IP Address', 'Failed Attempts', 'Risk Level'], tablefmt='grid'))
        
        # Recent events (last 20)
        if results['events']:
            print(f"\n{Fore.YELLOW}[*] Recent Security Events (Last 20):{Style.RESET_ALL}")
            recent_events = results['events'][-20:]
            event_data = []
            
            for event in recent_events:
                timestamp = event.get('timestamp', 'Unknown')[:19] if event.get('timestamp') else 'Unknown'
                event_type = event.get('type', 'Unknown')
                ip = event.get('ip', 'Unknown')
                description = event.get('line', '')[:60] + "..." if len(event.get('line', '')) > 60 else event.get('line', '')
                
                event_data.append([timestamp, event_type, ip, description])
            
            print(tabulate(event_data, headers=['Timestamp', 'Event Type', 'Source IP', 'Description'], tablefmt='grid'))
        
        # Security recommendations
        self.display_recommendations(results)
    
    def display_recommendations(self, results):
        """Display security recommendations based on analysis"""
        print(f"\n{Fore.CYAN}[*] Security Recommendations:{Style.RESET_ALL}")
        
        recommendations = []
        
        if results['brute_force_ips'] > 0:
            recommendations.append("• Implement fail2ban or similar IP blocking for repeated failed logins")
            recommendations.append("• Enable two-factor authentication for SSH and web services")
        
        if results['web_attacks'] > 0:
            recommendations.append("• Review and strengthen web application security (WAF, input validation)")
            recommendations.append("• Update web applications and frameworks to latest versions")
        
        if results['privilege_escalation'] > 0:
            recommendations.append("• Review sudo/su access and implement principle of least privilege")
            recommendations.append("• Monitor privileged account usage more closely")
        
        if results['network_scans'] > 0:
            recommendations.append("• Consider implementing intrusion detection system (IDS)")
            recommendations.append("• Review firewall rules and network segmentation")
        
        if results['suspicious_ips'] > 5:
            recommendations.append("• Block known malicious IP addresses at firewall level")
            recommendations.append("• Implement geoblocking if attacks come from specific regions")
        
        if not recommendations:
            recommendations.append("• Continue monitoring logs regularly")
            recommendations.append("• Consider implementing automated log analysis")
        
        for recommendation in recommendations:
            print(f"  {recommendation}")
        
        print(f"\n{Fore.GREEN}[+] Log analysis completed{Style.RESET_ALL}")