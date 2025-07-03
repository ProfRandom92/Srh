# Security Research Helper (Srh)

A comprehensive, multi-module security tool for network scanning, vulnerability assessment, and security analysis.

## 🛡️ Features

### Core Security Modules

- **🔍 Network Scanner** - Network discovery and device enumeration
- **🚪 Port Scanner** - Advanced TCP/UDP port scanning with service detection  
- **🛡️ Vulnerability Scanner** - SSL/TLS, HTTP, SSH, DNS, and SMB vulnerability detection
- **📁 File Security Analyzer** - File system security analysis and permission auditing
- **🔐 Password Checker** - Password strength analysis with breach database checking
- **📊 Log Analyzer** - Security log analysis and threat detection
- **📋 Report Generator** - Comprehensive security reports in HTML, JSON, and TXT formats

### Key Capabilities

- **Multi-threaded scanning** for fast performance
- **Comprehensive vulnerability detection** across multiple protocols
- **Real-time breach database checking** via HaveIBeenPwned API
- **Advanced log pattern matching** for security event detection
- **Professional reporting** with detailed findings and recommendations
- **Cross-platform compatibility** (Linux, Windows, macOS)

## 🚀 Quick Start

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd srh
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Make executable (Linux/macOS):**
   ```bash
   chmod +x main.py
   ```

### Basic Usage

```bash
# Show available modules and help
python main.py info

# Network discovery
python main.py network -t 192.168.1.0/24

# Port scanning
python main.py portscan -t 192.168.1.1 -p 1-65535

# Vulnerability assessment
python main.py vulnscan -t example.com

# File security analysis
python main.py filescan -p /home/user -r

# Password strength checking
python main.py password

# Log analysis
python main.py logs -l /var/log/auth.log

# Generate security report
python main.py report -f html -o my_assessment
```

## 📖 Detailed Usage

### Network Scanner
Discovers active hosts and identifies running services.

```bash
# Scan network range
python main.py network -t 192.168.1.0/24 -i eth0

# Scan single host
python main.py network -t 192.168.1.1
```

**Features:**
- Host discovery via ICMP ping
- Hostname resolution
- Service identification on common ports
- Response time measurement

### Port Scanner
Advanced port scanning with service detection and security analysis.

```bash
# TCP port scan
python main.py portscan -t target.com -p 1-1000 --tcp

# UDP port scan  
python main.py portscan -t target.com -p 53,161,500 --udp

# Scan specific ports
python main.py portscan -t target.com -p 80,443,22,21
```

**Features:**
- Multi-threaded scanning
- TCP and UDP support
- Service banner grabbing
- Security risk analysis
- Custom port ranges

### Vulnerability Scanner
Comprehensive vulnerability assessment across multiple protocols.

```bash
# Quick vulnerability scan
python main.py vulnscan -t example.com -q

# Comprehensive scan
python main.py vulnscan -t example.com
```

**Detects:**
- SSL/TLS vulnerabilities (weak protocols, ciphers, expired certificates)
- HTTP security issues (missing headers, dangerous methods)
- SSH vulnerabilities (version checks, banner analysis)
- DNS misconfigurations (zone transfers, recursion)
- SMB security issues (SMBv1, open shares)

### File Security Analyzer
Analyzes file systems for security vulnerabilities and misconfigurations.

```bash
# Analyze directory (non-recursive)
python main.py filescan -p /etc

# Recursive analysis
python main.py filescan -p /home/user -r
```

**Identifies:**
- World-writable files
- SUID/SGID binaries
- Suspicious files and extensions
- Sensitive files (keys, configs, databases)
- Permission issues
- Hidden files

### Password Checker
Analyzes password strength using multiple criteria and breach databases.

```bash
# Interactive password check
python main.py password

# Check specific password
python main.py password -p "mypassword123"

# Batch check from file
python main.py password -f passwords.txt
```

**Analysis includes:**
- Entropy calculation
- Character composition analysis
- Common pattern detection
- Breach database lookup (HaveIBeenPwned)
- Strength scoring (0-100)
- Crack time estimation

### Log Analyzer
Analyzes security logs for threats, attacks, and suspicious activities.

```bash
# Analyze auth logs
python main.py logs -l /var/log/auth.log

# Search for custom patterns
python main.py logs -l /var/log/apache2/access.log -p "union select"

# Analyze compressed logs
python main.py logs -l /var/log/auth.log.gz
```

**Detects:**
- Failed login attempts and brute force attacks
- Web application attacks (SQL injection, XSS, directory traversal)
- Privilege escalation attempts
- Network scanning activities
- Suspicious IP addresses
- Custom pattern matching

### Report Generator
Creates comprehensive security assessment reports.

```bash
# HTML report (default)
python main.py report -f html -o security_assessment

# JSON report for automation
python main.py report -f json -o security_data

# Plain text report
python main.py report -f txt -o security_summary
```

**Report features:**
- Executive summary with risk assessment
- Detailed findings by module
- System information collection
- Security recommendations
- Professional formatting
- Timestamp and metadata

## 🔧 Advanced Configuration

### Environment Variables
```bash
export SRH_THREADS=200          # Number of scanning threads
export SRH_TIMEOUT=5            # Connection timeout (seconds)
export SRH_OUTPUT_DIR=./reports # Report output directory
```

### Custom Scanning
```bash
# High-speed port scan
python main.py portscan -t target.com -p 1-65535 --threads 500

# Comprehensive vulnerability assessment
python main.py vulnscan -t target.com --comprehensive

# Deep file analysis
python main.py filescan -p / -r --include-system
```

## 🛠️ Development

### Project Structure
```
srh/
├── main.py                     # Main CLI application
├── requirements.txt            # Dependencies
├── modules/                    # Security modules
│   ├── __init__.py
│   ├── network_scanner.py      # Network discovery
│   ├── port_scanner.py         # Port scanning
│   ├── vulnerability_scanner.py# Vulnerability assessment
│   ├── file_security.py        # File system analysis
│   ├── password_checker.py     # Password security
│   ├── log_analyzer.py         # Log analysis
│   └── report_generator.py     # Report generation
└── reports/                    # Generated reports
```

### Adding Custom Modules
1. Create new module in `modules/` directory
2. Implement required methods: `scan()`, `display_results()`
3. Add module to `main.py` CLI interface
4. Update documentation

## 🔒 Security Considerations

- **Network Scanning**: Ensure you have permission to scan target networks
- **Log Analysis**: Handle sensitive log data appropriately
- **Password Checking**: Passwords are not stored or logged
- **Vulnerability Scanning**: Use responsibly and ethically
- **Report Storage**: Secure generated reports containing sensitive information

## 📋 Requirements

### System Requirements
- Python 3.7+
- Linux, Windows, or macOS
- Administrative privileges for some scans

### Python Dependencies
- requests
- python-nmap
- scapy (for advanced network features)
- cryptography
- psutil
- colorama
- tabulate
- click
- PyYAML
- paramiko
- dns

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-module`)
3. Commit changes (`git commit -am 'Add new security module'`)
4. Push to branch (`git push origin feature/new-module`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is for educational and authorized security testing purposes only. Users are responsible for ensuring they have proper authorization before scanning or testing any systems. The authors are not responsible for any misuse of this tool.

## 🆘 Support

For questions, issues, or feature requests:
- Create an issue on GitHub
- Check the documentation
- Review existing issues and discussions

---

**Security Research Helper (Srh) v1.0** - Comprehensive Security Analysis Tool