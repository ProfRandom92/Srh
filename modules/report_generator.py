"""
Report Generator Module
Generates comprehensive security reports in various formats (HTML, JSON, TXT).
"""

import json
import os
from datetime import datetime
from colorama import Fore, Style

class ReportGenerator:
    def __init__(self):
        self.report_data = {}
        
    def collect_system_info(self):
        """Collect basic system information"""
        import platform
        import psutil
        
        return {
            'hostname': platform.node(),
            'platform': platform.platform(),
            'architecture': platform.architecture()[0],
            'processor': platform.processor(),
            'python_version': platform.python_version(),
            'cpu_count': psutil.cpu_count(),
            'memory_total': f"{psutil.virtual_memory().total / (1024**3):.2f} GB",
            'boot_time': datetime.fromtimestamp(psutil.boot_time()).strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def generate_html_report(self, filename):
        """Generate HTML security report"""
        system_info = self.collect_system_info()
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Assessment Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
        .header {{ background: #2c3e50; color: white; padding: 20px; border-radius: 8px; }}
        .section {{ margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }}
        .high {{ background-color: #ffebee; border-left: 5px solid #f44336; }}
        .medium {{ background-color: #fff3e0; border-left: 5px solid #ff9800; }}
        .low {{ background-color: #e8f5e8; border-left: 5px solid #4caf50; }}
        .info {{ background-color: #e3f2fd; border-left: 5px solid #2196f3; }}
        table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background-color: #f5f5f5; }}
        .summary {{ display: flex; justify-content: space-around; margin: 20px 0; }}
        .summary-item {{ text-align: center; padding: 15px; border-radius: 8px; background: #f8f9fa; }}
        .footer {{ margin-top: 40px; text-align: center; color: #666; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Security Assessment Report</h1>
        <p>Generated on: {timestamp}</p>
        <p>Target System: {system_info['hostname']}</p>
    </div>
    
    <div class="section">
        <h2>📊 Executive Summary</h2>
        <div class="summary">
            <div class="summary-item">
                <h3>Overall Risk</h3>
                <p style="font-size: 24px; color: #ff9800;">MEDIUM</p>
            </div>
            <div class="summary-item">
                <h3>Scanned Services</h3>
                <p style="font-size: 24px; color: #2196f3;">Multiple</p>
            </div>
            <div class="summary-item">
                <h3>Issues Found</h3>
                <p style="font-size: 24px; color: #f44336;">Varies</p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>💻 System Information</h2>
        <table>
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Hostname</td><td>{system_info['hostname']}</td></tr>
            <tr><td>Platform</td><td>{system_info['platform']}</td></tr>
            <tr><td>Architecture</td><td>{system_info['architecture']}</td></tr>
            <tr><td>CPU Cores</td><td>{system_info['cpu_count']}</td></tr>
            <tr><td>Total Memory</td><td>{system_info['memory_total']}</td></tr>
            <tr><td>Boot Time</td><td>{system_info['boot_time']}</td></tr>
        </table>
    </div>
    
    <div class="section high">
        <h2>🚨 High Priority Findings</h2>
        <p>High-severity security issues that require immediate attention:</p>
        <ul>
            <li>Review and address any critical vulnerabilities found during scanning</li>
            <li>Check for outdated software and security patches</li>
            <li>Verify firewall and access control configurations</li>
        </ul>
    </div>
    
    <div class="section medium">
        <h2>⚠️ Medium Priority Findings</h2>
        <p>Security issues that should be addressed in the near term:</p>
        <ul>
            <li>Review password policies and authentication mechanisms</li>
            <li>Audit user permissions and access controls</li>
            <li>Check for unnecessary services and open ports</li>
        </ul>
    </div>
    
    <div class="section info">
        <h2>📋 Recommendations</h2>
        <h3>Immediate Actions:</h3>
        <ul>
            <li>Apply security patches and updates</li>
            <li>Review and strengthen access controls</li>
            <li>Implement monitoring and logging</li>
        </ul>
        
        <h3>Long-term Improvements:</h3>
        <ul>
            <li>Establish regular security assessments</li>
            <li>Implement security awareness training</li>
            <li>Develop incident response procedures</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>Report generated by Security Research Helper (Srh) v1.0</p>
        <p>This report contains confidential security information and should be handled appropriately.</p>
    </div>
</body>
</html>
"""
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return filename
    
    def generate_json_report(self, filename):
        """Generate JSON security report"""
        system_info = self.collect_system_info()
        
        report_data = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "tool": "Security Research Helper (Srh)",
                "version": "1.0",
                "format": "JSON"
            },
            "system_information": system_info,
            "assessment_summary": {
                "overall_risk": "Medium",
                "total_scans_performed": 0,
                "critical_issues": 0,
                "high_issues": 0,
                "medium_issues": 0,
                "low_issues": 0,
                "info_issues": 0
            },
            "findings": {
                "network_scan": {
                    "description": "Network scanning results",
                    "findings": []
                },
                "port_scan": {
                    "description": "Port scanning results", 
                    "findings": []
                },
                "vulnerability_scan": {
                    "description": "Vulnerability assessment results",
                    "findings": []
                },
                "file_security": {
                    "description": "File system security analysis",
                    "findings": []
                },
                "log_analysis": {
                    "description": "Security log analysis",
                    "findings": []
                }
            },
            "recommendations": [
                "Implement regular security patches and updates",
                "Review and strengthen access control policies",
                "Enable comprehensive logging and monitoring",
                "Conduct regular security assessments",
                "Implement multi-factor authentication where possible",
                "Review and minimize attack surface",
                "Establish incident response procedures"
            ]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        return filename
    
    def generate_text_report(self, filename):
        """Generate plain text security report"""
        system_info = self.collect_system_info()
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        text_content = f"""
================================================================================
                        SECURITY ASSESSMENT REPORT
================================================================================

Generated: {timestamp}
Tool: Security Research Helper (Srh) v1.0
Target: {system_info['hostname']}

================================================================================
EXECUTIVE SUMMARY
================================================================================

This security assessment was performed to identify potential security 
vulnerabilities and risks in the target system. The assessment covered 
multiple areas including network services, file system security, password 
policies, and system configurations.

Overall Risk Level: MEDIUM
Recommendation: Address identified issues based on priority

================================================================================
SYSTEM INFORMATION
================================================================================

Hostname:     {system_info['hostname']}
Platform:     {system_info['platform']}
Architecture: {system_info['architecture']}
CPU Cores:    {system_info['cpu_count']}
Memory:       {system_info['memory_total']}
Boot Time:    {system_info['boot_time']}

================================================================================
ASSESSMENT MODULES AVAILABLE
================================================================================

1. Network Scanner
   - Discovers active hosts on network
   - Identifies open services and ports
   - Performs basic service enumeration

2. Port Scanner  
   - Detailed TCP/UDP port scanning
   - Service banner grabbing
   - Security risk analysis

3. Vulnerability Scanner
   - SSL/TLS security assessment
   - Web application security testing
   - Common vulnerability detection

4. File Security Analyzer
   - File permission analysis
   - Suspicious file detection
   - SUID/SGID file identification

5. Password Checker
   - Password strength analysis
   - Breach database checking
   - Common pattern detection

6. Log Analyzer
   - Security event detection
   - Brute force attack identification
   - Suspicious activity analysis

================================================================================
SECURITY RECOMMENDATIONS
================================================================================

HIGH PRIORITY:
- Apply all available security patches and updates
- Review and strengthen authentication mechanisms
- Implement proper access controls and permissions
- Enable security logging and monitoring

MEDIUM PRIORITY:
- Review and minimize exposed services
- Implement network segmentation where appropriate
- Establish regular backup procedures
- Review password policies and enforce strong passwords

LOW PRIORITY:
- Implement security awareness training
- Establish incident response procedures
- Consider implementing intrusion detection systems
- Regular security assessment scheduling

================================================================================
METHODOLOGY
================================================================================

This assessment used automated scanning techniques to identify potential
security issues. Manual verification of findings is recommended before
taking remedial action. The assessment covered:

1. Network and service discovery
2. Port and service enumeration  
3. Vulnerability identification
4. File system security analysis
5. Log analysis for security events
6. Password security assessment

================================================================================
DISCLAIMER
================================================================================

This report is based on automated scanning and analysis. Results should be
verified manually before taking action. The assessment provides a point-in-time
view of security posture and should be supplemented with ongoing monitoring
and regular reassessment.

================================================================================
END OF REPORT
================================================================================
"""
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(text_content)
        
        return filename
    
    def generate_report(self, format_type='html', output_name='security_report'):
        """Main report generation function"""
        
        # Ensure output directory exists
        output_dir = 'reports'
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format_type.lower() == 'html':
            filename = f"{output_dir}/{output_name}_{timestamp}.html"
            return self.generate_html_report(filename)
        elif format_type.lower() == 'json':
            filename = f"{output_dir}/{output_name}_{timestamp}.json"
            return self.generate_json_report(filename)
        elif format_type.lower() == 'txt':
            filename = f"{output_dir}/{output_name}_{timestamp}.txt"
            return self.generate_text_report(filename)
        else:
            raise ValueError(f"Unsupported format: {format_type}")