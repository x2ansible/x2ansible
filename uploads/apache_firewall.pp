class apache_with_firewall {
  package { 'httpd':
    ensure => installed,
  }

  service { 'httpd':
    ensure     => running,
    enable     => true,
    require    => Package['httpd'],
  }

  file { '/var/www/html/index.html':
    ensure  => file,
    content => 'Welcome to Puppet-managed Apache!',
    mode    => '0644',
    owner   => 'root',
    group   => 'root',
    require => Service['httpd'],
  }

  exec { 'allow_http_traffic':
    command => '/usr/sbin/ufw allow 80/tcp',
    unless  => '/usr/sbin/ufw status | grep "80/tcp"',
    path    => ['/usr/bin', '/usr/sbin'],
  }
}
