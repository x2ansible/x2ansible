file { '/var/www/html':
  ensure  => directory,
  owner   => 'root',
  group   => 'root',
  mode    => '0755',
}

file { '/var/www/html/index.html':
  ensure  => file,
  content => template('apache/index.html.erb'),
  owner   => 'root',
  group   => 'root',
  mode    => '0644',
}

user { 'webadmin':
  ensure => present,
  home   => '/home/webadmin',
  shell  => '/bin/bash',
}

service { 'apache2':
  ensure => running,
  enable => true,
}

service { 'apache2':
  ensure => running,
}
