"""
Password Checker Module
Analyzes password strength and security based on various criteria.
"""

import re
import hashlib
import requests
from colorama import Fore, Style
from tabulate import tabulate
import string
import math

class PasswordChecker:
    def __init__(self):
        self.common_passwords = [
            'password', '123456', '12345678', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            '1234567890', 'password1', '123456789', 'dragon', 'master'
        ]
        
        self.keyboard_patterns = [
            'qwerty', 'asdf', 'zxcv', '123456', '987654',
            'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
        ]
    
    def calculate_entropy(self, password):
        """Calculate password entropy"""
        charset_size = 0
        
        if any(c.islower() for c in password):
            charset_size += 26
        if any(c.isupper() for c in password):
            charset_size += 26
        if any(c.isdigit() for c in password):
            charset_size += 10
        if any(c in string.punctuation for c in password):
            charset_size += len(string.punctuation)
        
        if charset_size == 0:
            return 0
        
        entropy = len(password) * math.log2(charset_size)
        return entropy
    
    def check_common_patterns(self, password):
        """Check for common patterns in password"""
        issues = []
        password_lower = password.lower()
        
        # Check for keyboard patterns
        for pattern in self.keyboard_patterns:
            if pattern in password_lower:
                issues.append(f"Contains keyboard pattern: {pattern}")
        
        # Check for repeated characters
        for i in range(len(password) - 2):
            if password[i] == password[i+1] == password[i+2]:
                issues.append(f"Contains repeated characters: {password[i]}")
                break
        
        # Check for sequential numbers
        if re.search(r'(012|123|234|345|456|567|678|789|890)', password):
            issues.append("Contains sequential numbers")
        
        # Check for sequential letters
        if re.search(r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', password_lower):
            issues.append("Contains sequential letters")
        
        # Check for common substitutions
        substitutions = {
            '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o',
            '5': 's', '7': 't', '4': 'a'
        }
        
        normalized = password_lower
        for char, replacement in substitutions.items():
            normalized = normalized.replace(char, replacement)
        
        for common in self.common_passwords:
            if common in normalized:
                issues.append(f"Contains common password pattern: {common}")
        
        return issues
    
    def check_breach_database(self, password):
        """Check if password appears in known breaches using HaveIBeenPwned API"""
        try:
            # Create SHA-1 hash of password
            sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
            prefix = sha1_hash[:5]
            suffix = sha1_hash[5:]
            
            # Query HaveIBeenPwned API
            url = f"https://api.pwnedpasswords.com/range/{prefix}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                # Check if our suffix appears in the response
                for line in response.text.splitlines():
                    hash_suffix, count = line.split(':')
                    if hash_suffix == suffix:
                        return True, int(count)
            
            return False, 0
        except:
            return None, 0  # Network error or other issue
    
    def analyze_password_composition(self, password):
        """Analyze password composition"""
        composition = {
            'length': len(password),
            'lowercase': sum(1 for c in password if c.islower()),
            'uppercase': sum(1 for c in password if c.isupper()),
            'digits': sum(1 for c in password if c.isdigit()),
            'special': sum(1 for c in password if c in string.punctuation),
            'spaces': sum(1 for c in password if c.isspace())
        }
        
        return composition
    
    def calculate_crack_time(self, password):
        """Estimate time to crack password"""
        entropy = self.calculate_entropy(password)
        
        # Assume 1 billion guesses per second
        guesses_per_second = 1e9
        combinations = 2 ** entropy
        
        # Time to crack (average case is half the keyspace)
        seconds = (combinations / 2) / guesses_per_second
        
        if seconds < 60:
            return f"{seconds:.2f} seconds"
        elif seconds < 3600:
            return f"{seconds/60:.2f} minutes"
        elif seconds < 86400:
            return f"{seconds/3600:.2f} hours"
        elif seconds < 31536000:
            return f"{seconds/86400:.2f} days"
        else:
            return f"{seconds/31536000:.2f} years"
    
    def get_password_score(self, password):
        """Calculate overall password score (0-100)"""
        score = 0
        
        # Length scoring
        if len(password) >= 12:
            score += 25
        elif len(password) >= 8:
            score += 15
        elif len(password) >= 6:
            score += 5
        
        # Character type scoring
        composition = self.analyze_password_composition(password)
        
        if composition['lowercase'] > 0:
            score += 5
        if composition['uppercase'] > 0:
            score += 5
        if composition['digits'] > 0:
            score += 5
        if composition['special'] > 0:
            score += 10
        
        # Entropy scoring
        entropy = self.calculate_entropy(password)
        if entropy >= 60:
            score += 25
        elif entropy >= 40:
            score += 15
        elif entropy >= 20:
            score += 10
        
        # Penalty for common patterns
        patterns = self.check_common_patterns(password)
        score -= len(patterns) * 10
        
        # Penalty for being in breach database
        breached, count = self.check_breach_database(password)
        if breached:
            score -= 30
        elif breached is None:
            pass  # Network error, no penalty
        
        return max(0, min(100, score))
    
    def get_strength_level(self, score):
        """Get password strength level based on score"""
        if score >= 80:
            return "Very Strong", Fore.GREEN
        elif score >= 60:
            return "Strong", Fore.CYAN
        elif score >= 40:
            return "Moderate", Fore.YELLOW
        elif score >= 20:
            return "Weak", Fore.RED
        else:
            return "Very Weak", Fore.RED
    
    def check_password(self, password):
        """Main password checking function"""
        if not password:
            return None
        
        result = {
            'password': '*' * len(password),  # Don't store actual password
            'length': len(password),
            'score': self.get_password_score(password),
            'composition': self.analyze_password_composition(password),
            'entropy': self.calculate_entropy(password),
            'crack_time': self.calculate_crack_time(password),
            'patterns': self.check_common_patterns(password),
            'breached': self.check_breach_database(password)
        }
        
        strength, color = self.get_strength_level(result['score'])
        result['strength'] = strength
        result['color'] = color
        
        return result
    
    def check_password_file(self, filename):
        """Check passwords from a file"""
        try:
            with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
                passwords = [line.strip() for line in f if line.strip()]
            
            print(f"{Fore.BLUE}[*] Checking {len(passwords)} passwords...{Style.RESET_ALL}")
            
            results = []
            for i, password in enumerate(passwords, 1):
                if i % 10 == 0:
                    print(f"{Fore.CYAN}[*] Processed {i}/{len(passwords)} passwords...{Style.RESET_ALL}")
                
                result = self.check_password(password)
                if result:
                    result['index'] = i
                    results.append(result)
            
            self.display_batch_results(results)
            
        except FileNotFoundError:
            print(f"{Fore.RED}[!] File not found: {filename}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}[!] Error reading file: {str(e)}{Style.RESET_ALL}")
    
    def display_result(self, result):
        """Display single password analysis result"""
        if not result:
            return
        
        print(f"\n{Fore.CYAN}[*] Password Analysis Results{Style.RESET_ALL}")
        print(f"Password: {result['password']}")
        print(f"Length: {result['length']} characters")
        print(f"Strength: {result['color']}{result['strength']}{Style.RESET_ALL}")
        print(f"Score: {result['score']}/100")
        print(f"Entropy: {result['entropy']:.2f} bits")
        print(f"Estimated crack time: {result['crack_time']}")
        
        # Composition
        comp = result['composition']
        print(f"\nComposition:")
        print(f"  Lowercase: {comp['lowercase']}")
        print(f"  Uppercase: {comp['uppercase']}")
        print(f"  Digits: {comp['digits']}")
        print(f"  Special characters: {comp['special']}")
        print(f"  Spaces: {comp['spaces']}")
        
        # Issues
        if result['patterns']:
            print(f"\n{Fore.YELLOW}[!] Issues detected:{Style.RESET_ALL}")
            for pattern in result['patterns']:
                print(f"  • {pattern}")
        
        # Breach check
        breached, count = result['breached']
        if breached:
            print(f"\n{Fore.RED}[!] This password has been found in {count:,} data breaches!{Style.RESET_ALL}")
        elif breached is False:
            print(f"\n{Fore.GREEN}[+] This password was not found in known data breaches{Style.RESET_ALL}")
        else:
            print(f"\n{Fore.YELLOW}[?] Could not check breach database (network error){Style.RESET_ALL}")
    
    def display_batch_results(self, results):
        """Display batch password analysis results"""
        if not results:
            return
        
        print(f"\n{Fore.GREEN}[+] Password Analysis Complete{Style.RESET_ALL}")
        
        # Summary statistics
        scores = [r['score'] for r in results]
        avg_score = sum(scores) / len(scores)
        
        strength_counts = {}
        breached_count = 0
        
        for result in results:
            strength = result['strength']
            strength_counts[strength] = strength_counts.get(strength, 0) + 1
            
            breached, count = result['breached']
            if breached:
                breached_count += 1
        
        print(f"\nSummary:")
        print(f"  Total passwords: {len(results)}")
        print(f"  Average score: {avg_score:.1f}/100")
        print(f"  Breached passwords: {breached_count}")
        
        print(f"\nStrength distribution:")
        for strength, count in strength_counts.items():
            percentage = (count / len(results)) * 100
            print(f"  {strength}: {count} ({percentage:.1f}%)")
        
        # Show worst passwords
        worst_passwords = sorted(results, key=lambda x: x['score'])[:5]
        if worst_passwords:
            print(f"\n{Fore.RED}[!] Weakest passwords:{Style.RESET_ALL}")
            table_data = []
            for result in worst_passwords:
                breached, count = result['breached']
                breach_status = f"Yes ({count:,})" if breached else "No" if breached is False else "Unknown"
                table_data.append([
                    result['index'],
                    result['score'],
                    result['strength'],
                    breach_status
                ])
            
            print(tabulate(table_data, headers=['#', 'Score', 'Strength', 'Breached'], tablefmt='grid'))