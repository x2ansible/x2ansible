package { ['httpd', 'git', 'curl']:
  ensure => installed,
}

service { 'httpd':
  ensure    => running,
  enable    => true,
  hasstatus => true,
  hasrestart => true,
}

file { '/etc/httpd/conf.d/webapp.conf':
  ensure  => file,
  content => template('webapp/webapp.conf.erb'),
  mode    => '0644',
  owner   => 'root',
  group   => 'root',
}

exec { 'create_redhat_banner':
  command => 'echo "Welcome to Red Hat WebApp" > /etc/motd',
  unless  => 'test -f /etc/motd',
}
