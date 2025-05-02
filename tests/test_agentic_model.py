# tests/test_agentic_model.py

import os
import sys
import logging
from pathlib import Path

# Ensure ai_modules is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure logging to console + file (logs/app.log)
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "app.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

from ai_modules.agentic_model import AgenticModel

def main():
    model = AgenticModel(
        base_url="http://localhost:8321",
        vector_db="convert"
    )

    #   Puppet input (forces RAG usage)
    input_code = """
    Can you convert the following code to ansible 
    class webapp {
      package { [ 'httpd', 'mysql', 'git', 'curl' ]:
        ensure => installed,
      }

      service { 'httpd':
        ensure     => running,
        enable     => true,
        hasstatus  => true,
        hasrestart => true,
      }

      file { '/etc/httpd/conf.d/webapp.conf':
        ensure  => file,
        content => template('webapp/webapp.conf.erb'),
        mode    => '0644',
        owner   => 'root',
        group   => 'root',
        notify  => Service['httpd'],
      }

      vcsrepo { '/var/www/html/webapp':
        ensure   => present,
        provider => git,
        source   => 'https://github.com/example/webapp.git',
        revision => 'main',
        require  => Package['git'],
      }

      file { '/var/www/html/webapp/config/database.yml':
        ensure  => file,
        content => template('webapp/database.yml.erb'),
        mode    => '0644',
        owner   => 'apache',
        group   => 'apache',
        require => File['/var/www/html/webapp'],
      }

      user { 'webadmin':
        ensure     => present,
        managehome => true,
        shell      => '/bin/bash',
      }

      cron { 'db_backup':
        ensure  => present,
        command => '/usr/local/bin/backup.sh',
        user    => 'root',
        hour    => 2,
        minute  => 0,
      }

      exec { 'create_welcome_banner':
        command => 'echo "Welcome to the WebApp Server!" > /etc/motd',
        unless  => 'test -f /etc/motd',
      }
    }
    """

    print("\n=== Running AgenticModel.transform() ===\n")
    output_generator = model.transform(
        code=input_code,
        mode="convert",
        stream_ui=False
    )

    final_output = ""
    for chunk in output_generator:
        print(chunk, end="")
        final_output += chunk

    print("\n\n=== Final Output ===\n")
    print(final_output)

if __name__ == "__main__":
    main()
