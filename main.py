#!/usr/bin/env python3
"""
Security Research Helper (Srh) - Comprehensive Security Tool
A multi-module security tool for network scanning, vulnerability assessment, and security analysis.
"""

import click
import sys
import os
from colorama import init, Fore, Style
from modules.network_scanner import NetworkScanner
from modules.file_security import FileSecurityAnalyzer
from modules.password_checker import PasswordChecker
from modules.vulnerability_scanner import VulnerabilityScanner
from modules.log_analyzer import LogAnalyzer
from modules.port_scanner import PortScanner
from modules.report_generator import ReportGenerator

# Initialize colorama for cross-platform colored output
init(autoreset=True)

class SecurityTool:
    def __init__(self):
        self.modules = {
            'network': NetworkScanner(),
            'file': FileSecurityAnalyzer(),
            'password': PasswordChecker(),
            'vuln': VulnerabilityScanner(),
            'logs': LogAnalyzer(),
            'ports': PortScanner(),
            'report': ReportGenerator()
        }
    
    def print_banner(self):
        banner = f"""
{Fore.CYAN}
███████╗██████╗ ██╗  ██╗
██╔════╝██╔══██╗██║  ██║
███████╗██████╔╝███████║
╚════██║██╔══██╗██╔══██║
███████║██║  ██║██║  ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
{Style.RESET_ALL}
{Fore.YELLOW}Security Research Helper v1.0{Style.RESET_ALL}
{Fore.GREEN}Comprehensive Security Analysis Tool{Style.RESET_ALL}
"""
        print(banner)

@click.group()
@click.pass_context
def cli(ctx):
    """Security Research Helper - Comprehensive Security Tool"""
    ctx.ensure_object(dict)
    tool = SecurityTool()
    tool.print_banner()
    ctx.obj['tool'] = tool

@cli.command()
@click.option('--target', '-t', required=True, help='Target IP address or hostname')
@click.option('--interface', '-i', default='eth0', help='Network interface to use')
@click.pass_context
def network(ctx, target, interface):
    """Perform network discovery and analysis"""
    scanner = ctx.obj['tool'].modules['network']
    click.echo(f"{Fore.BLUE}[*] Starting network scan on {target}...{Style.RESET_ALL}")
    results = scanner.scan_network(target, interface)
    scanner.display_results(results)

@cli.command()
@click.option('--path', '-p', required=True, help='Path to scan for security issues')
@click.option('--recursive', '-r', is_flag=True, help='Scan recursively')
@click.pass_context
def filescan(ctx, path, recursive):
    """Analyze file system for security vulnerabilities"""
    analyzer = ctx.obj['tool'].modules['file']
    click.echo(f"{Fore.BLUE}[*] Starting file security scan on {path}...{Style.RESET_ALL}")
    results = analyzer.analyze_directory(path, recursive)
    analyzer.display_results(results)

@cli.command()
@click.option('--password', '-p', help='Password to check (will prompt if not provided)')
@click.option('--file', '-f', help='File containing passwords to check')
@click.pass_context
def password(ctx, password, file):
    """Check password strength and security"""
    checker = ctx.obj['tool'].modules['password']
    
    if file:
        click.echo(f"{Fore.BLUE}[*] Checking passwords from file: {file}...{Style.RESET_ALL}")
        checker.check_password_file(file)
    else:
        if not password:
            password = click.prompt('Enter password to check', hide_input=True)
        click.echo(f"{Fore.BLUE}[*] Checking password strength...{Style.RESET_ALL}")
        result = checker.check_password(password)
        checker.display_result(result)

@cli.command()
@click.option('--target', '-t', required=True, help='Target to scan for vulnerabilities')
@click.option('--quick', '-q', is_flag=True, help='Perform quick scan')
@click.pass_context
def vulnscan(ctx, target, quick):
    """Scan for common vulnerabilities"""
    scanner = ctx.obj['tool'].modules['vuln']
    click.echo(f"{Fore.BLUE}[*] Starting vulnerability scan on {target}...{Style.RESET_ALL}")
    results = scanner.scan_target(target, quick_scan=quick)
    scanner.display_results(results)

@cli.command()
@click.option('--logfile', '-l', required=True, help='Log file to analyze')
@click.option('--pattern', '-p', help='Specific pattern to search for')
@click.pass_context
def logs(ctx, logfile, pattern):
    """Analyze log files for security events"""
    analyzer = ctx.obj['tool'].modules['logs']
    click.echo(f"{Fore.BLUE}[*] Analyzing log file: {logfile}...{Style.RESET_ALL}")
    results = analyzer.analyze_logs(logfile, pattern)
    analyzer.display_results(results)

@cli.command()
@click.option('--target', '-t', required=True, help='Target to scan ports')
@click.option('--ports', '-p', default='1-1000', help='Port range to scan (e.g., 1-1000)')
@click.option('--tcp', is_flag=True, default=True, help='Scan TCP ports')
@click.option('--udp', is_flag=True, help='Scan UDP ports')
@click.pass_context
def portscan(ctx, target, ports, tcp, udp):
    """Scan for open ports on target"""
    scanner = ctx.obj['tool'].modules['ports']
    click.echo(f"{Fore.BLUE}[*] Starting port scan on {target}...{Style.RESET_ALL}")
    results = scanner.scan_ports(target, ports, tcp, udp)
    scanner.display_results(results)

@cli.command()
@click.option('--format', '-f', default='html', type=click.Choice(['html', 'json', 'txt']), help='Report format')
@click.option('--output', '-o', default='security_report', help='Output filename (without extension)')
@click.pass_context
def report(ctx, format, output):
    """Generate comprehensive security report"""
    generator = ctx.obj['tool'].modules['report']
    click.echo(f"{Fore.BLUE}[*] Generating {format.upper()} security report...{Style.RESET_ALL}")
    filename = generator.generate_report(format, output)
    click.echo(f"{Fore.GREEN}[+] Report saved as: {filename}{Style.RESET_ALL}")

@cli.command()
def info():
    """Display tool information and available modules"""
    click.echo(f"""
{Fore.CYAN}Security Research Helper (Srh){Style.RESET_ALL}
{Fore.YELLOW}Available Modules:{Style.RESET_ALL}

🔍 {Fore.GREEN}network{Style.RESET_ALL}    - Network discovery and analysis
📁 {Fore.GREEN}filescan{Style.RESET_ALL}   - File system security analysis
🔐 {Fore.GREEN}password{Style.RESET_ALL}   - Password strength checking
🛡️  {Fore.GREEN}vulnscan{Style.RESET_ALL}   - Vulnerability scanning
📊 {Fore.GREEN}logs{Style.RESET_ALL}       - Log file analysis
🚪 {Fore.GREEN}portscan{Style.RESET_ALL}   - Port scanning
📋 {Fore.GREEN}report{Style.RESET_ALL}     - Generate comprehensive reports

{Fore.YELLOW}Usage Examples:{Style.RESET_ALL}
  python main.py network -t 192.168.1.1
  python main.py filescan -p /home/user -r
  python main.py password -f passwords.txt
  python main.py vulnscan -t example.com -q
  python main.py portscan -t 192.168.1.1 -p 1-65535
  python main.py report -f html -o my_report
""")

if __name__ == '__main__':
    try:
        cli()
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.RED}[!] Operation cancelled by user{Style.RESET_ALL}")
        sys.exit(0)
    except Exception as e:
        click.echo(f"{Fore.RED}[!] Error: {str(e)}{Style.RESET_ALL}")
        sys.exit(1)