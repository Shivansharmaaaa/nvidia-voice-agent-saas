#!/usr/bin/env python3
"""Live progress monitor for pip installation"""
import time
import os
import sys
import re

log_file = '/tmp/pip_install_full.log'

def count_packages_in_requirements():
    """Count total packages to install"""
    try:
        with open('requirements.txt', 'r') as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith('#')]
        return len([l for l in lines if '==' in l or '>=' in l])
    except:
        return 0

def parse_progress():
    """Parse pip output to get progress"""
    try:
        if not os.path.exists(log_file):
            return None
        
        with open(log_file, 'r') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Count completed packages
        collecting = len(re.findall(r'Collecting (\S+)', content))
        downloading = len(re.findall(r'Downloading (\S+)', content))
        installed = len(re.findall(r'Successfully installed (\S+)', content))
        installing = len(re.findall(r'Installing collected packages', content))
        
        # Check for completion
        completed = 'Successfully installed' in content or 'Requirement already satisfied' in content
        error = 'ERROR' in content or 'error:' in content.lower()
        
        # Get latest activity
        last_lines = [l for l in lines[-15:] if l.strip()]
        
        # Calculate progress percentage
        total = count_packages_in_requirements()
        if total > 0:
            progress_pct = min(100, int((installing / total) * 100)) if installing > 0 else 0
        else:
            progress_pct = 0
        
        return {
            'collecting': collecting,
            'downloading': downloading,
            'installing': installing,
            'installed': installed,
            'total': total,
            'progress_pct': progress_pct,
            'completed': completed,
            'error': error,
            'last_lines': last_lines[-8:]
        }
    except Exception as e:
        return {'error': str(e)}

def main():
    print("📦 Voice Agent Installation Monitor")
    print("=" * 70)
    print("Press Ctrl+C to stop monitoring (installation will continue)\n")
    
    try:
        while True:
            progress = parse_progress()
            
            if progress and 'error' in progress and isinstance(progress['error'], str):
                print(f"Error reading log: {progress['error']}")
                time.sleep(2)
                continue
            
            if not progress:
                print("⏳ Waiting for installation to start...")
                time.sleep(1)
                continue
            
            # Clear screen (works better in terminal)
            os.system('clear' if os.name != 'nt' else 'cls')
            
            print("📦 Voice Agent Installation Progress")
            print("=" * 70)
            
            if progress['total'] > 0:
                bar_length = 50
                filled = int(bar_length * progress['progress_pct'] / 100)
                bar = '█' * filled + '░' * (bar_length - filled)
                print(f"\nProgress: [{bar}] {progress['progress_pct']}%")
                print(f"Packages: {progress['installed']}/{progress['total']} installed")
            else:
                print(f"\nPackages collected: {progress['collecting']}")
                print(f"Packages downloaded: {progress['downloading']}")
                print(f"Packages installed: {progress['installing']}")
            
            print("\n" + "=" * 70)
            print("Latest activity:")
            print("-" * 70)
            for line in progress.get('last_lines', [])[-6:]:
                # Truncate long lines
                display_line = line[:100] + '...' if len(line) > 100 else line
                print(f"  {display_line}")
            
            if progress.get('completed'):
                print("\n" + "=" * 70)
                print("✅ Installation completed successfully!")
                break
            elif progress.get('error'):
                print("\n" + "=" * 70)
                print("❌ Installation error detected. Check log for details.")
                print(f"Log file: {log_file}")
                break
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n\n⏸️  Monitoring stopped. Installation continues in background.")
        print(f"Check progress: tail -f {log_file}")

if __name__ == '__main__':
    main()
