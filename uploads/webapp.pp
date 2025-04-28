#Deploys a rail webapp as defined in facts loaded from (service-scope) cloudify attributes:
#   $service_webapp_repo - the git repo to clone
#   $service_webapp_tag  - the tag to checkout

$WEBAPP_PATH="/opt/webapps/rails"
notify{"Beginning deploy of $service_webapp_repo version $service_webapp_tag into $WEBAPP_PATH":}

package {["rubygems", "ruby-dev", "libxml2-dev", "libxslt-dev", "libsqlite3-dev", "libmysqlclient-dev"]: }

package {"bundler":
    provider => gem,
    require => Package["rubygems"],
}

class {'apache': }
apache::module { 'proxy_http': }

file { '/opt/webapps':
    ensure => "directory",
}

exec {'fetch webapp repo':
    command => "git clone $service_webapp_repo $WEBAPP_PATH",
    path    => "/usr/bin/:/usr/local/bin/:/bin/",
    creates => "$WEBAPP_PATH",
    require => File['/opt/webapps'],
}

exec {'fetch webapp tag':
    command => "git checkout $service_webapp_tag",
    path    => "/usr/bin/:/usr/local/bin/:/bin/",
    cwd     => "$WEBAPP_PATH",
    require => Exec['fetch webapp repo'],
}

#install unicorn
file { 'Gemfile.local':
    path => "$WEBAPP_PATH/Gemfile.local",
    content => "gem 'unicorn'\n",
    require => Exec['fetch webapp tag'],
}

exec {"bundle install":
    command => "bundle install --without development test rmagick postgresql",
    cwd     => "$WEBAPP_PATH",
    path    => "/usr/bin/:/usr/local/bin/:/bin/",
    require => [File['Gemfile.local'], Package["bundler"]],
}

exec {'generate secret':
    command => "bundle exec rake generate_session_store",
    cwd     => "$WEBAPP_PATH",
    path    => "/usr/bin/:/usr/local/bin/:/bin/",
    require => Exec['bundle install'],
}

#use the mysql service for the production db
$db_user = get_cloudify_attribute('user', 'service', 'redmine_puppet', 'mysql')
$db_password = get_cloudify_attribute('password', 'service', 'redmine_puppet', 'mysql')
$db_name = get_cloudify_attribute('db_name', 'service', 'redmine_puppet', 'mysql')
$db_ip = get_cloudify_attribute('ip', 'service', 'redmine_puppet', 'mysql')
file{ "$WEBAPP_PATH/config/database.yml":
    content => template('webapp/database.yml.erb'),
    require => Exec['bundle install'],
}

exec {'rake tasks':
    command => "bundle exec rake db:migrate RAILS_ENV=production && bundle exec rake redmine:load_default_data RAILS_ENV=production REDMINE_LANG=en",
    cwd     => "$WEBAPP_PATH",
    path    => "/usr/bin/:/usr/local/bin/:/bin/",
    require => [File["$WEBAPP_PATH/config/database.yml"], Exec['generate secret']],
}

#set up unicorn
user { "rails":
    ensure => present,
    comment => "rails",
    membership => minimum,
    shell => "/bin/sh",
    home => "$WEBAPP_PATH",
    require => Exec['fetch webapp repo'],
}

file { ["$WEBAPP_PATH/files", "$WEBAPP_PATH/log", "$WEBAPP_PATH/tmp", "$WEBAPP_PATH/public"]:
    owner   => "rails",
    mode    => "0755",
    require => User["rails"],
}

upstart::job {"unicorn":
    description => "unicorn app server",
    command     => "start-stop-daemon --start -c rails -d $WEBAPP_PATH --exec /usr/local/bin/bundle -- exec unicorn_rails -E production",
    require => [Exec['rake tasks', 'generate secret'], File['Gemfile.local']],
}

#set up apache
exec {'disable default vhost':
    command => "/usr/sbin/a2dissite default",
    require => Package['apache']
}

apache::vhost { 'webapp':
  template => 'webapp/webapp.erb',
  require => Exec['rake tasks', 'generate secret', 'disable default vhost'],
}