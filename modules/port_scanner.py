"""
Port Scanner Module
Advanced port scanning with TCP/UDP support and service detection.
"""

import socket
import threading
import time
from datetime import datetime
from colorama import Fore, Style
from tabulate import tabulate
import subprocess
import sys

class PortScanner:
    def __init__(self):
        self.open_ports = []
        self.lock = threading.Lock()
        self.common_ports = {
            21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
            80: 'HTTP', 110: 'POP3', 111: 'RPC', 135: 'RPC', 139: 'NetBIOS',
            143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
            1723: 'PPTP', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
            5900: 'VNC', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt'
        }
    
    def scan_tcp_port(self, target, port, timeout=1):
        """Scan a single TCP port"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((target, port))
            sock.close()
            
            if result == 0:
                service = self.identify_service(port)
                banner = self.grab_banner(target, port)
                return {
                    'port': port,
                    'protocol': 'TCP',
                    'state': 'Open',
                    'service': service,
                    'banner': banner
                }
        except:
            pass
        return None
    
    def scan_udp_port(self, target, port, timeout=2):
        """Scan a single UDP port (basic implementation)"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(timeout)
            sock.sendto(b"", (target, port))
            
            # UDP scanning is tricky - we'll mark as open if no ICMP error
            service = self.identify_service(port)
            return {
                'port': port,
                'protocol': 'UDP',
                'state': 'Open|Filtered',
                'service': service,
                'banner': ''
            }
        except:
            pass
        return None
    
    def grab_banner(self, target, port, timeout=2):
        """Attempt to grab service banner"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            sock.connect((target, port))
            
            # Send HTTP request for web services
            if port in [80, 8080]:
                sock.send(b"HEAD / HTTP/1.0\r\n\r\n")
            elif port in [443, 8443]:
                return "HTTPS (SSL/TLS)"
            
            banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
            sock.close()
            return banner[:100] if banner else ""
        except:
            return ""
    
    def identify_service(self, port):
        """Identify service by port number"""
        return self.common_ports.get(port, 'Unknown')
    
    def parse_port_range(self, port_range):
        """Parse port range string into list of ports"""
        ports = []
        
        if ',' in port_range:
            # Handle comma-separated ports
            for part in port_range.split(','):
                ports.extend(self.parse_port_range(part.strip()))
        elif '-' in port_range:
            # Handle range (e.g., 1-1000)
            start, end = map(int, port_range.split('-'))
            ports.extend(range(start, end + 1))
        else:
            # Single port
            ports.append(int(port_range))
        
        return sorted(list(set(ports)))  # Remove duplicates and sort
    
    def worker_thread(self, target, ports, protocol, timeout):
        """Worker thread for scanning ports"""
        for port in ports:
            if protocol.upper() == 'TCP':
                result = self.scan_tcp_port(target, port, timeout)
            else:
                result = self.scan_udp_port(target, port, timeout)
            
            if result:
                with self.lock:
                    self.open_ports.append(result)
    
    def scan_ports(self, target, port_range='1-1000', tcp=True, udp=False, threads=100, timeout=1):
        """Main port scanning function"""
        start_time = time.time()
        self.open_ports = []
        
        # Parse port range
        try:
            ports = self.parse_port_range(port_range)
        except ValueError:
            print(f"{Fore.RED}[!] Invalid port range: {port_range}{Style.RESET_ALL}")
            return []
        
        print(f"{Fore.BLUE}[*] Scanning {len(ports)} ports on {target}...{Style.RESET_ALL}")
        
        # Split ports among threads
        chunk_size = max(1, len(ports) // threads)
        port_chunks = [ports[i:i + chunk_size] for i in range(0, len(ports), chunk_size)]
        
        thread_list = []
        
        # Start TCP scan if requested
        if tcp:
            print(f"{Fore.CYAN}[*] Starting TCP scan...{Style.RESET_ALL}")
            for chunk in port_chunks:
                thread = threading.Thread(
                    target=self.worker_thread,
                    args=(target, chunk, 'TCP', timeout)
                )
                thread.start()
                thread_list.append(thread)
        
        # Start UDP scan if requested
        if udp:
            print(f"{Fore.CYAN}[*] Starting UDP scan...{Style.RESET_ALL}")
            for chunk in port_chunks:
                thread = threading.Thread(
                    target=self.worker_thread,
                    args=(target, chunk, 'UDP', timeout * 2)  # UDP needs more time
                )
                thread.start()
                thread_list.append(thread)
        
        # Wait for all threads to complete
        for thread in thread_list:
            thread.join()
        
        # Sort results by port number
        self.open_ports.sort(key=lambda x: x['port'])
        
        scan_time = time.time() - start_time
        print(f"{Fore.GREEN}[+] Scan completed in {scan_time:.2f} seconds{Style.RESET_ALL}")
        
        return self.open_ports
    
    def display_results(self, results):
        """Display port scan results"""
        if not results:
            print(f"{Fore.RED}[!] No open ports found{Style.RESET_ALL}")
            return
        
        print(f"\n{Fore.GREEN}[+] Port Scan Results{Style.RESET_ALL}")
        print(f"{Fore.GREEN}[+] Found {len(results)} open port(s){Style.RESET_ALL}\n")
        
        # Prepare data for table
        table_data = []
        for result in results:
            banner = result['banner'][:40] + "..." if len(result['banner']) > 40 else result['banner']
            table_data.append([
                result['port'],
                result['protocol'],
                result['state'],
                result['service'],
                banner
            ])
        
        headers = ['Port', 'Protocol', 'State', 'Service', 'Banner']
        print(tabulate(table_data, headers=headers, tablefmt='grid'))
        
        # Security analysis
        self.analyze_security_implications(results)
    
    def analyze_security_implications(self, results):
        """Analyze security implications of open ports"""
        print(f"\n{Fore.YELLOW}[*] Security Analysis{Style.RESET_ALL}")
        
        risky_ports = []
        secure_ports = []
        
        for result in results:
            port = result['port']
            service = result['service']
            
            # Check for risky services
            if port in [21, 23, 25, 110, 143]:  # Unencrypted protocols
                risky_ports.append(f"Port {port} ({service}) - Unencrypted protocol")
            elif port in [135, 139, 445]:  # Windows-specific ports
                risky_ports.append(f"Port {port} ({service}) - Windows service (SMB/RPC)")
            elif port == 3389:  # RDP
                risky_ports.append(f"Port {port} ({service}) - Remote Desktop (brute force target)")
            elif port in [443, 22, 993, 995]:  # Encrypted protocols
                secure_ports.append(f"Port {port} ({service}) - Encrypted protocol")
        
        if risky_ports:
            print(f"{Fore.RED}[!] Potentially risky services detected:{Style.RESET_ALL}")
            for risk in risky_ports:
                print(f"  • {risk}")
        
        if secure_ports:
            print(f"{Fore.GREEN}[+] Secure services detected:{Style.RESET_ALL}")
            for secure in secure_ports:
                print(f"  • {secure}")
        
        if not risky_ports and not secure_ports:
            print(f"{Fore.CYAN}[*] No specific security concerns identified{Style.RESET_ALL}")