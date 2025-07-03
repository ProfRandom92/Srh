"""
Network Scanner Module
Performs network discovery, device enumeration, and network analysis.
"""

import socket
import subprocess
import threading
import time
from datetime import datetime
from colorama import Fore, Style
from tabulate import tabulate
import ipaddress
import os

class NetworkScanner:
    def __init__(self):
        self.results = {}
        self.threads = []
        
    def ping_host(self, host):
        """Ping a host to check if it's alive"""
        try:
            # Use ping command based on OS
            param = '-n' if os.name == 'nt' else '-c'
            command = ['ping', param, '1', '-W', '1000', host]
            result = subprocess.run(command, capture_output=True, text=True, timeout=3)
            return result.returncode == 0
        except:
            return False
    
    def scan_host(self, host, common_ports=None):
        """Scan a single host for common open ports"""
        if common_ports is None:
            common_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 8080, 8443]
        
        host_info = {
            'host': host,
            'alive': False,
            'open_ports': [],
            'hostname': None,
            'response_time': None
        }
        
        # Check if host is alive
        start_time = time.time()
        if self.ping_host(host):
            host_info['alive'] = True
            host_info['response_time'] = round((time.time() - start_time) * 1000, 2)
            
            # Try to resolve hostname
            try:
                host_info['hostname'] = socket.gethostbyaddr(host)[0]
            except:
                host_info['hostname'] = 'Unknown'
            
            # Scan common ports
            for port in common_ports:
                if self.scan_port(host, port):
                    service = self.identify_service(port)
                    host_info['open_ports'].append({'port': port, 'service': service})
        
        return host_info
    
    def scan_port(self, host, port, timeout=1):
        """Scan a specific port on a host"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except:
            return False
    
    def identify_service(self, port):
        """Identify common services by port number"""
        services = {
            21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
            80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
            993: 'IMAPS', 995: 'POP3S', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt'
        }
        return services.get(port, 'Unknown')
    
    def scan_network_range(self, network):
        """Scan a network range for active hosts"""
        try:
            net = ipaddress.ip_network(network, strict=False)
            hosts = []
            
            for host in net.hosts():
                if len(hosts) >= 254:  # Limit to avoid too many hosts
                    break
                hosts.append(str(host))
            
            return hosts
        except:
            return [network]  # Treat as single host if not a valid network
    
    def scan_network(self, target, interface=None):
        """Main network scanning function"""
        print(f"{Fore.BLUE}[*] Starting network scan...{Style.RESET_ALL}")
        
        # Determine if target is a network range or single host
        hosts_to_scan = self.scan_network_range(target)
        
        results = []
        total_hosts = len(hosts_to_scan)
        
        print(f"{Fore.YELLOW}[*] Scanning {total_hosts} host(s)...{Style.RESET_ALL}")
        
        # Scan each host
        for i, host in enumerate(hosts_to_scan, 1):
            print(f"{Fore.CYAN}[*] Scanning {host} ({i}/{total_hosts})...{Style.RESET_ALL}")
            host_result = self.scan_host(host)
            if host_result['alive']:
                results.append(host_result)
        
        return results
    
    def display_results(self, results):
        """Display scan results in a formatted table"""
        if not results:
            print(f"{Fore.RED}[!] No active hosts found{Style.RESET_ALL}")
            return
        
        print(f"\n{Fore.GREEN}[+] Network Scan Results{Style.RESET_ALL}")
        print(f"{Fore.GREEN}[+] Found {len(results)} active host(s){Style.RESET_ALL}\n")
        
        # Prepare data for table
        table_data = []
        for result in results:
            ports_str = ', '.join([f"{p['port']}/{p['service']}" for p in result['open_ports']])
            if not ports_str:
                ports_str = "No open ports detected"
            
            table_data.append([
                result['host'],
                result['hostname'],
                f"{result['response_time']}ms",
                len(result['open_ports']),
                ports_str[:50] + "..." if len(ports_str) > 50 else ports_str
            ])
        
        headers = ['Host', 'Hostname', 'Response Time', 'Open Ports', 'Services']
        print(tabulate(table_data, headers=headers, tablefmt='grid'))
        
        # Show detailed port information for each host
        for result in results:
            if result['open_ports']:
                print(f"\n{Fore.YELLOW}[*] Detailed port scan for {result['host']}:{Style.RESET_ALL}")
                port_table = []
                for port_info in result['open_ports']:
                    port_table.append([port_info['port'], port_info['service']])
                
                print(tabulate(port_table, headers=['Port', 'Service'], tablefmt='simple'))